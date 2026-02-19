"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PdfUploader from "@/components/PdfUploader";
import ChatBox from "@/components/ChatBox";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [session, setSession] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [projectFiles, setProjectFiles] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProjects();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProjects();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchFiles(selectedProject.id);
    } else {
      setProjectFiles([]);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    setProjects(data || []);
  };

  const fetchFiles = async (projectId) => {
    // We only need the filenames, and we want them distinct
    // Supabase JS doesn't have a distinct query builder out of the box for this
    // but we can just group by in JS or select all filenames and deduplicate
    const { data } = await supabase
      .from("pdf_docs")
      .select("filename")
      .eq("project_id", projectId);

    if (data) {
      const uniqueFiles = [...new Set(data.map(d => d.filename))];
      setProjectFiles(uniqueFiles);
    }
  };

  const handleDownload = async (filename) => {
    const { data, error } = await supabase.storage
      .from("pdfs")
      .download(`${session.user.id}/${selectedProject.id}/${filename}`);

    if (error) {
      console.error("Download error:", error);
      alert("Error downloading file. It might not be in the new storage bucket yet.");
      return;
    }

    // Create a Blob URL and trigger download
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    const { data, error } = await supabase
      .from("projects")
      .insert([{ name: newProjectName, user_id: session.user.id }])
      .select()
      .single();

    if (data) {
      setProjects([data, ...projects]);
      setNewProjectName("");
      setSelectedProject(data);
    }
  };

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  if (!session) {
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
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>Logout</Button>
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
                className={`w-full text-left p-3 rounded-md transition-colors ${selectedProject?.id === p.id ? "bg-primary text-primary-foreground font-medium" : "bg-muted/50 hover:bg-muted"
                  }`}
                onClick={() => setSelectedProject(p)}
              >
                {p.name}
              </button>
            </li>
          ))}
          {projects.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No projects yet.</p>}
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
              <p className="text-sm text-gray-500 mt-1">Upload PDFs and ask questions specifically for this project.</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 border rounded-xl bg-card shadow-sm col-span-2 md:col-span-1">
                <h3 className="font-semibold mb-4">Chat Context</h3>
                {projectFiles.length > 0 ? (
                  <ul className="space-y-2 mb-6">
                    {projectFiles.map(file => (
                      <li key={file} className="text-sm bg-muted/50 p-2 rounded flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-base shrink-0">📄</span>
                          <span className="truncate" title={file}>{file}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(file)} className="shrink-0 h-8 px-2" title="Download PDF">
                          ⬇️
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 mb-6 italic">No PDFs uploaded yet. Upload one below.</p>
                )}

                <PdfUploader
                  projectId={selectedProject.id}
                  token={session.access_token}
                  onUploadSuccess={() => fetchFiles(selectedProject.id)}
                />
              </div>

              <div className="p-6 border rounded-xl bg-card shadow-sm col-span-2 md:col-span-1">
                <ChatBox projectId={selectedProject.id} token={session.access_token} />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
