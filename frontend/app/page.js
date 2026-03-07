"use client";

import { useEffect, useState } from "react";
import { auth, db, googleProvider } from "@/lib/firebase";
import {
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  ref as dbRef,
  push,
  get,
  remove,
  update,
  set,
} from "firebase/database";
import PdfUploader from "@/components/PdfUploader";
import ChatInterface from "@/components/ChatInterface";
import ShareModal from "@/components/ShareModal";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [projectFiles, setProjectFiles] = useState([]);
  const [showUploader, setShowUploader] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const hasFullAccess = !selectedProject?.is_shared || selectedProject?.role === "full";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) fetchProjects(firebaseUser.uid);
      else { setProjects([]); setSelectedProject(null); }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedProject && user) {
      const ownerUid = selectedProject.owner_uid || user.uid;
      fetchFiles(selectedProject.id, ownerUid);
      setShowUploader(false);
    } else {
      setProjectFiles([]);
    }
  }, [selectedProject]);

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
    await set(dbRef(db, `projects/${user.uid}/${p.id}`), null);
    await set(dbRef(db, `pdf_files/${user.uid}/${p.id}`), null);
    await set(dbRef(db, `pdf_docs/${user.uid}/${p.id}`), null);
    await set(dbRef(db, `chats/${user.uid}/${p.id}`), null);
    await set(dbRef(db, `chat_messages/${user.uid}/${p.id}`), null);
    setProjects(projects.filter((x) => x.id !== p.id));
    if (selectedProject?.id === p.id) { setSelectedProject(null); setProjectFiles([]); }
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      if (error.code === "auth/popup-blocked" || error.code === "auth/popup-cancelled") {
        await signInWithRedirect(auth, googleProvider);
      }
    }
  };

  const getToken = async () => user ? await user.getIdToken() : null;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-sm px-6">
          <div className="text-6xl">📄</div>
          <h1 className="text-3xl font-bold">PDF Chat</h1>
          <p className="text-muted-foreground">Upload PDFs and chat with your documents using AI.</p>
          <Button onClick={loginWithGoogle} className="w-full" size="lg">
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Sidebar — Projects */}
      <div className="w-60 shrink-0 border-r flex flex-col bg-muted/10">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <span className="font-bold text-sm">📄 PDF Chat</span>
          <button onClick={() => signOut(auth)} className="text-xs text-muted-foreground hover:text-foreground transition" title="Logout">
            Sign out
          </button>
        </div>

        {/* New project input */}
        <div className="p-3 border-b">
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="New project..."
              className="flex-1 text-xs border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProject()}
            />
            <Button size="sm" onClick={createProject} className="text-xs px-3">+</Button>
          </div>
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {projects.length === 0 && (
            <p className="text-xs text-muted-foreground text-center pt-6">No projects yet</p>
          )}
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProject(p)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm truncate flex items-center justify-between gap-1 group transition-colors ${selectedProject?.id === p.id ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"
                }`}
            >
              <span className="truncate">📁 {p.name}</span>
              <span
                onClick={(e) => deleteProject(p, e)}
                className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity text-xs"
                title="Delete project"
              >🗑️</span>
            </button>
          ))}
        </div>

        {/* User info */}
        <div className="p-3 border-t flex items-center gap-2">
          {user.photoURL && <img src={user.photoURL} className="w-7 h-7 rounded-full" alt="" />}
          <span className="text-xs text-muted-foreground truncate">{user.displayName || user.email}</span>
        </div>
      </div>

      {/* Main Area */}
      {!selectedProject ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-3">
            <div className="text-5xl">👈</div>
            <p className="font-medium">Select or create a project to start</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Project header */}
          <div className="border-b px-6 py-3 flex items-center justify-between shrink-0">
            <div>
              <h2 className="font-bold text-lg">{selectedProject.name}</h2>
              <p className="text-xs text-muted-foreground">{projectFiles.length} PDF(s) loaded</p>
            </div>
            <div className="flex items-center gap-2">
              {hasFullAccess && (
                <button
                  onClick={shareProject}
                  className="text-xs border rounded-lg px-3 py-1.5 hover:bg-muted transition flex items-center gap-1"
                  title="Invite others via Email"
                >
                  ✉️ Share
                </button>
              )}
              <button
                onClick={() => setShowUploader(!showUploader)}
                className="text-xs border rounded-lg px-3 py-1.5 hover:bg-muted transition flex items-center gap-1"
              >
                📎 {showUploader ? "Hide" : "Manage"} PDFs
              </button>
            </div>
          </div>

          {/* PDF Manager panel (collapsible) */}
          {showUploader && (
            <div className="border-b px-6 py-4 bg-muted/20 shrink-0">
              <div className="flex gap-6 flex-wrap">
                {/* File list */}
                <div className="flex-1 min-w-[200px]">
                  <h4 className="text-sm font-medium mb-2">Uploaded PDFs</h4>
                  {projectFiles.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No PDFs yet</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {projectFiles.map((f) => (
                        <li key={f.filename} className="flex items-center gap-2 text-xs">
                          <span>📄</span>
                          <span className="truncate flex-1">{f.filename}</span>
                          {f.url && (
                            <a href={f.url} target="_blank" rel="noopener noreferrer"
                              className="px-1.5 py-0.5 bg-primary text-primary-foreground rounded text-xs hover:opacity-80">⬇️</a>
                          )}
                          {hasFullAccess && (
                            <button onClick={() => deleteFile(f)}
                              className="px-1.5 py-0.5 bg-destructive text-destructive-foreground rounded text-xs hover:opacity-80">🗑️</button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* Uploader */}
                {hasFullAccess && (
                  <div className="flex-1 min-w-[220px]">
                    <h4 className="text-sm font-medium mb-2">Upload New PDFs</h4>
                    <PdfUploader
                      projectId={selectedProject.id}
                      uid={selectedProject.owner_uid || user.uid}
                      getToken={getToken}
                      onUploadSuccess={() => fetchFiles(selectedProject.id, selectedProject.owner_uid || user.uid)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat Interface */}
          <div className="flex-1 min-h-0">
            <ChatInterface
              projectId={selectedProject.id}
              uid={selectedProject.owner_uid || user.uid}
              getToken={getToken}
              projectFiles={projectFiles}
              ownerUid={selectedProject.owner_uid || user.uid}
              allowedPdfs={projectFiles.map((f) => f.filename)}
            />
          </div>

          <ShareModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            project={selectedProject}
            projectFiles={projectFiles}
            user={user}
          />
        </div>
      )}
    </div>
  );
}
