"use client";

import { useEffect, useState } from "react";
import { auth, db, storage, googleProvider } from "@/lib/firebase";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { ref, getBlob } from "firebase/storage";
import PdfUploader from "@/components/PdfUploader";
import ChatBox from "@/components/ChatBox";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [projectFiles, setProjectFiles] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setIdToken(token);
        fetchProjects(firebaseUser.uid);
      } else {
        setIdToken(null);
        setProjects([]);
        setSelectedProject(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchFiles(selectedProject.id);
    } else {
      setProjectFiles([]);
    }
  }, [selectedProject]);

  const fetchProjects = async (uid) => {
    try {
      const q = query(
        collection(db, "projects"),
        where("user_id", "==", uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          // Sort by created_at descending (newest first) client-side
          const aTime = a.created_at?.seconds ?? 0;
          const bTime = b.created_at?.seconds ?? 0;
          return bTime - aTime;
        });
      setProjects(data);
    } catch (err) {
      console.error("fetchProjects error:", err);
    }
  };

  const fetchFiles = async (projectId) => {
    const q = query(
      collection(db, "pdf_docs"),
      where("project_id", "==", projectId),
      where("user_id", "==", user.uid)
    );
    const snapshot = await getDocs(q);
    const filenames = snapshot.docs.map((doc) => doc.data().filename);
    const uniqueFiles = [...new Set(filenames)];
    setProjectFiles(uniqueFiles);
  };

  const handleDownload = async (filename) => {
    try {
      const storagePath = `${user.uid}/${selectedProject.id}/${filename}`;
      const fileRef = ref(storage, storagePath);
      const blob = await getBlob(fileRef);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error("Download error:", error);
      alert("Error downloading file.");
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, "projects"), {
        name: newProjectName,
        user_id: user.uid,
        created_at: serverTimestamp(),
      });
      const newProject = { id: docRef.id, name: newProjectName, user_id: user.uid };
      setProjects([newProject, ...projects]);
      setNewProjectName("");
      setSelectedProject(newProject);
    } catch (err) {
      console.error("createProject error:", err);
      alert("Failed to create project: " + err.message);
    }
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Refresh ID token for API calls (tokens expire after 1 hour)
  const getToken = async () => {
    if (!user) return null;
    return await user.getIdToken();
  };

  if (!user) {
    return (
      <main className="max-w-md mx-auto p-8 mt-20 text-center space-y-6">
        <h1 className="text-3xl font-bold">📄 PDF Chat App</h1>
        <p className="text-gray-500">Sign in to manage your projects and PDFs.</p>
        <Button onClick={loginWithGoogle} className="w-full">Sign in with Google</Button>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-8 grid md:grid-cols-3 gap-8">
      {/* Sidebar for Projects */}
      <div className="space-y-6 md:border-r pr-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Projects</h2>
          <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New project name..."
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
          <Button onClick={createProject}>Add</Button>
        </div>

        <ul className="space-y-2">
          {projects.map((p) => (
            <li key={p.id}>
              <button
                className={`w-full text-left p-3 rounded-md transition-colors ${selectedProject?.id === p.id
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-muted/50 hover:bg-muted"
                  }`}
                onClick={() => setSelectedProject(p)}
              >
                {p.name}
              </button>
            </li>
          ))}
          {projects.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No projects yet.</p>
          )}
        </ul>
      </div>

      {/* Main Content Area */}
      <div className="md:col-span-2 space-y-8 pl-2">
        {!selectedProject ? (
          <div className="h-full flex items-center justify-center text-gray-500 min-h-[400px] border-2 border-dashed rounded-lg">
            <p>Select or create a project from the sidebar to start chatting.</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="border-b pb-4">
              <h2 className="text-3xl font-bold">{selectedProject.name}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Upload PDFs and ask questions specifically for this project.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 border rounded-xl bg-card shadow-sm col-span-2 md:col-span-1">
                <h3 className="font-semibold mb-4">Chat Context</h3>
                {projectFiles.length > 0 ? (
                  <ul className="space-y-2 mb-6">
                    {projectFiles.map((file) => (
                      <li
                        key={file}
                        className="text-sm bg-muted/50 p-2 rounded flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-base shrink-0">📄</span>
                          <span className="truncate" title={file}>{file}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file)}
                          className="shrink-0 h-8 px-2"
                          title="Download PDF"
                        >
                          ⬇️
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 mb-6 italic">
                    No PDFs uploaded yet. Upload one below.
                  </p>
                )}

                <PdfUploader
                  projectId={selectedProject.id}
                  getToken={getToken}
                  onUploadSuccess={() => fetchFiles(selectedProject.id)}
                />
              </div>

              <div className="p-6 border rounded-xl bg-card shadow-sm col-span-2 md:col-span-1">
                <ChatBox projectId={selectedProject.id} getToken={getToken} />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
