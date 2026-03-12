"use client";

import { useEffect, useState, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
    ref as dbRef,
    push,
    get,
    remove,
    update,
    set,
} from "firebase/database";
import PdfUploader from "@/components/PdfUploader";
import { ThemeToggle } from "@/components/ThemeToggle";
import ChatInterface from "@/components/ChatInterface";
import ShareModal from "@/components/ShareModal";
import TeamModal from "@/components/TeamModal";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { FileText, Plus, LogOut, Folder, Trash2, Users, Share, Paperclip } from "lucide-react";

export default function Dashboard() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [newProjectName, setNewProjectName] = useState("");
    const [projectFiles, setProjectFiles] = useState([]);
    const [showUploader, setShowUploader] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const bgRef = useRef(null);

    const router = useRouter();

    const hasFullAccess = !selectedProject?.is_shared || selectedProject?.role === "full";

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
            if (firebaseUser) {
                fetchProjects(firebaseUser.uid);
            } else {
                setProjects([]);
                setSelectedProject(null);
                router.push("/");
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (selectedProject && user) {
            const ownerUid = selectedProject.owner_uid || user.uid;
            fetchFiles(selectedProject.id, ownerUid);
            setShowUploader(false);
        } else {
            setProjectFiles([]);
        }
    }, [selectedProject, user]);

    useEffect(() => {
        if (!loading && bgRef.current) {
            // Subtle slow moving gradient/stars effect
            gsap.to(bgRef.current, {
                backgroundPosition: "100% 100%",
                ease: "none",
                duration: 60,
                repeat: -1,
                yoyo: true
            });
        }
    }, [loading]);

    const fetchProjects = async (uid) => {
        try {
            const snap = await get(dbRef(db, `projects/${uid}`));
            if (snap.exists()) {
                const list = Object.entries(snap.val())
                    .map(([id, v]) => ({ id, ...v }))
                    .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
                setProjects(list);
            } else setProjects([]);
        } catch (err) { console.error("fetchProjects:", err); }
    };

    const fetchFiles = async (projectId, projectOwnerUid) => {
        try {
            const snap = await get(dbRef(db, `pdf_files/${projectOwnerUid}/${projectId}`));
            let files = [];
            if (snap.exists()) {
                files = Object.values(snap.val()).map((f) => ({ filename: f.filename, url: f.url }));
            } else {
                // Fallback: read from pdf_docs chunks
                const docsSnap = await get(dbRef(db, `pdf_docs/${projectOwnerUid}/${projectId}`));
                if (docsSnap.exists()) {
                    const names = [...new Set(Object.values(docsSnap.val()).map((d) => d.filename).filter(Boolean))];
                    files = names.map((f) => ({ filename: f, url: null }));
                }
            }

            const proj = projects.find(p => p.id === projectId);
            if (proj && proj.role === "limited" && proj.allowed_pdfs) {
                files = files.filter(f => proj.allowed_pdfs.includes(f.filename));
            }
            setProjectFiles(files);
        } catch (err) { console.error("fetchFiles:", err); }
    };

    const deleteFile = async (f) => {
        if (!confirm(`Delete "${f.filename}"?`)) return;
        try {
            if (f.url) await fetch("/api/delete-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: f.url }) });
            const ownerUid = selectedProject.owner_uid || user.uid;
            const fileKey = f.filename.replace(/[^a-zA-Z0-9]/g, "_");
            await remove(dbRef(db, `pdf_files/${ownerUid}/${selectedProject.id}/${fileKey}`));
            const chunksRef = dbRef(db, `pdf_docs/${ownerUid}/${selectedProject.id}`);
            const snap = await get(chunksRef);
            if (snap.exists()) {
                const upd = {};
                Object.entries(snap.val()).forEach(([k, v]) => { if (v.filename === f.filename) upd[k] = null; });
                if (Object.keys(upd).length) await update(chunksRef, upd);
            }
            fetchFiles(selectedProject.id, ownerUid);
        } catch (err) { alert("Delete failed: " + err.message); }
    };

    const createProject = async () => {
        if (!newProjectName.trim()) return;
        try {
            const ref = await push(dbRef(db, `projects/${user.uid}`), { name: newProjectName, created_at: Date.now() });
            const newProject = { id: ref.key, name: newProjectName };
            setProjects([newProject, ...projects]);
            setNewProjectName("");
            setSelectedProject(newProject);
        } catch (err) { alert("Failed: " + err.message); }
    };

    const shareProject = () => {
        setShowShareModal(true);
    };

    const deleteProject = async (p, e) => {
        e.stopPropagation();
        if (!confirm(`Delete project "${p.name}" and all its data?`)) return;

        // Core project maps
        await set(dbRef(db, `projects/${user.uid}/${p.id}`), null);
        await set(dbRef(db, `pdf_files/${user.uid}/${p.id}`), null);
        await set(dbRef(db, `pdf_docs/${user.uid}/${p.id}`), null);
        await set(dbRef(db, `project_members/${p.id}`), null); // clean members if any

        // Clean up old chat format (backwards compatibility cleanup)
        await set(dbRef(db, `chats/${user.uid}/${p.id}`), null);
        await set(dbRef(db, `chat_messages/${user.uid}/${p.id}`), null);

        // Clean up new Personal chats
        await set(dbRef(db, `chats/personal/${user.uid}/${p.id}`), null);
        await set(dbRef(db, `chat_messages/personal/${user.uid}/${p.id}`), null);

        // Clean up new Group chats
        await set(dbRef(db, `chats/group/${p.id}`), null);
        await set(dbRef(db, `chat_messages/group/${p.id}`), null);

        setProjects(projects.filter((x) => x.id !== p.id));
        if (selectedProject?.id === p.id) { setSelectedProject(null); setProjectFiles([]); }
    };

    const getToken = async () => user ? await user.getIdToken() : null;

    if (loading || !user) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-background text-muted-foreground">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full"
                />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden relative font-sans selection:bg-primary/20">
            {/* GSAP Animated Background Map */}
            <div
                ref={bgRef}
                className="absolute inset-0 z-0 opacity-10 dark:opacity-20 pointer-events-none"
                style={{
                    backgroundImage: "radial-gradient(circle at center, currentColor 1px, transparent 1px)",
                    backgroundSize: "40px 40px"
                }}
            />

            {/* Ambient glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[128px] pointer-events-none z-0" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[128px] pointer-events-none z-0" />

            {/* Left Sidebar — Projects */}
            <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                className="w-64 shrink-0 border-r flex flex-col bg-card/50 backdrop-blur-xl z-10"
            >
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-inner">
                            <span className="text-primary-foreground font-bold text-sm">P</span>
                        </div>
                        <span className="font-semibold text-sm tracking-tight text-foreground">PDF Chat</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button onClick={() => signOut(auth)} className="text-muted-foreground hover:text-destructive transition" title="Logout">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* New project input */}
                <div className="p-3 border-b">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="New project..."
                            className="flex-1 text-xs border rounded-lg px-3 py-2 bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground transition-all"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && createProject()}
                        />
                        <Button size="icon" variant="secondary" onClick={createProject} className="h-auto w-8 shrink-0 bg-primary/10 hover:bg-primary/20 text-primary border-none">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Project list */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {projects.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center pt-6">No projects yet</p>
                    )}
                    <AnimatePresence>
                        {projects.map((p) => (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={p.id}
                                onClick={() => setSelectedProject(p)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm truncate flex items-center justify-between gap-2 group transition-all duration-200 ${selectedProject?.id === p.id
                                    ? "bg-primary/15 text-primary font-medium border-primary/20 shadow-inner"
                                    : "hover:bg-muted text-muted-foreground border-transparent"
                                    } border`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <Folder className={`w-4 h-4 shrink-0 ${selectedProject?.id === p.id ? "text-primary" : "text-muted-foreground"}`} />
                                    <span className="truncate">{p.name}</span>
                                </div>
                                <span
                                    onClick={(e) => deleteProject(p, e)}
                                    className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive text-muted-foreground transition-all p-1 hover:bg-destructive/10 rounded-md"
                                    title="Delete project"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </span>
                            </motion.button>
                        ))}
                    </AnimatePresence>
                </div>

                {/* User info */}
                <div className="p-3 border-t flex items-center gap-3 bg-muted/50">
                    {user.photoURL ? (
                        <img src={user.photoURL} className="w-8 h-8 rounded-full border" alt="" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs border">
                            {user.email?.[0]?.toUpperCase()}
                        </div>
                    )}
                    <span className="text-xs text-muted-foreground truncate font-medium">{user.displayName || user.email}</span>
                </div>
            </motion.div>

            {/* Main Area */}
            {!selectedProject ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground relative z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-4"
                    >
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto shadow-xl">
                            <Folder className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <p className="font-medium">Select or create a project to start</p>
                    </motion.div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col min-w-0 relative z-10 bg-background/50 backdrop-blur-sm">
                    {/* Project header */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="border-b px-6 py-4 flex items-center justify-between shrink-0 bg-card/30"
                    >
                        <div>
                            <h2 className="font-bold text-lg tracking-tight text-foreground">{selectedProject.name}</h2>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                <Paperclip className="w-3 h-3" /> {projectFiles.length} PDF(s) loaded
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {hasFullAccess && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={shareProject}
                                    className="text-xs bg-muted/50 hover:bg-muted text-foreground gap-1.5"
                                >
                                    <Share className="w-3.5 h-3.5" /> Share
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowTeamModal(true)}
                                className="text-xs bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary gap-1.5"
                            >
                                <Users className="w-3.5 h-3.5" /> Team
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowUploader(!showUploader)}
                                className={`text-xs gap-1.5 transition-colors ${showUploader ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 hover:bg-muted text-foreground"}`}
                            >
                                <Paperclip className="w-3.5 h-3.5" /> {showUploader ? "Hide PDFs" : "Manage PDFs"}
                            </Button>
                        </div>
                    </motion.div>

                    {/* PDF Manager panel (collapsible) */}
                    <AnimatePresence>
                        {showUploader && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-b bg-card/40 shrink-0"
                            >
                                <div className="p-6">
                                    <div className="flex gap-8 flex-wrap">
                                        {/* File list */}
                                        <div className="flex-1 min-w-[250px]">
                                            <h4 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
                                                <Folder className="w-4 h-4 text-muted-foreground" /> Uploaded Assets
                                            </h4>
                                            {projectFiles.length === 0 ? (
                                                <div className="p-4 rounded-xl border border-dashed bg-muted/50 text-center">
                                                    <p className="text-xs text-muted-foreground italic">No PDFs uploaded yet. Upload one to begin.</p>
                                                </div>
                                            ) : (
                                                <ul className="space-y-2">
                                                    {projectFiles.map((f) => (
                                                        <li key={f.filename} className="flex items-center gap-3 text-sm p-3 rounded-xl bg-muted/30 border hover:border-primary/30 transition-colors group">
                                                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                                                <FileText className="w-4 h-4" />
                                                            </div>
                                                            <span className="truncate flex-1 text-foreground font-medium">{f.filename}</span>
                                                            {f.url && (
                                                                <a href={f.url} target="_blank" rel="noopener noreferrer"
                                                                    className="px-3 py-1.5 bg-background text-foreground rounded-md text-xs hover:bg-muted transition font-medium border shadow-sm">View</a>
                                                            )}
                                                            {hasFullAccess && (
                                                                <button onClick={() => deleteFile(f)}
                                                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition" title="Delete File"><Trash2 className="w-4 h-4" /></button>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                        {/* Uploader */}
                                        {hasFullAccess && (
                                            <div className="flex-1 min-w-[280px]">
                                                <h4 className="text-sm font-semibold mb-3 text-foreground">Upload New PDFs</h4>
                                                <div className="rounded-xl overflow-hidden border bg-muted/30 p-1">
                                                    <PdfUploader
                                                        projectId={selectedProject.id}
                                                        uid={selectedProject.owner_uid || user.uid}
                                                        getToken={getToken}
                                                        onUploadSuccess={() => fetchFiles(selectedProject.id, selectedProject.owner_uid || user.uid)}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Chat Interface */}
                    <div className="flex-1 min-h-0 relative z-0">
                        <ChatInterface
                            projectId={selectedProject.id}
                            uid={selectedProject.owner_uid || user.uid}
                            getToken={getToken}
                            projectFiles={projectFiles}
                            ownerUid={selectedProject.owner_uid || user.uid}
                            allowedPdfs={projectFiles.map((f) => f.filename)}
                            onOpenShare={shareProject}
                            onOpenUploader={() => setShowUploader(true)}
                        />
                    </div>

                    <ShareModal
                        isOpen={showShareModal}
                        onClose={() => setShowShareModal(false)}
                        project={selectedProject}
                        projectFiles={projectFiles}
                        user={user}
                    />

                    <TeamModal
                        isOpen={showTeamModal}
                        onClose={() => setShowTeamModal(false)}
                        projectId={selectedProject.id}
                        project={selectedProject}
                    />
                </div>
            )}
        </div>
    );
}
