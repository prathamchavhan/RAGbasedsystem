"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { uploadPDF } from "@/lib/api";
import { db } from "@/lib/firebase";
import { ref as dbRef, set } from "firebase/database";

export default function PdfUploader({ projectId, uid, getToken, onUploadSuccess }) {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState([]);   // per-file status
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
    setProgress([]);
    setDone(false);
    setError("");
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setError("");
    setDone(false);

    const token = await getToken();
    const statuses = files.map((f) => ({ name: f.name, status: "pending" }));
    setProgress([...statuses]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Update status: uploading
      statuses[i].status = "uploading";
      setProgress([...statuses]);

      try {
        // Step 1: Upload to Vercel Blob for download
        const blobFormData = new FormData();
        blobFormData.append("file", file);
        blobFormData.append("uid", uid);
        blobFormData.append("project_id", projectId);

        const blobRes = await fetch("/api/upload-pdf", {
          method: "POST",
          body: blobFormData,
        });

        if (blobRes.ok) {
          const { url } = await blobRes.json();
          const fileKey = file.name.replace(/[^a-zA-Z0-9]/g, "_");
          await set(dbRef(db, `pdf_files/${uid}/${projectId}/${fileKey}`), {
            filename: file.name,
            url,
            uploaded_at: Date.now(),
          });
        }

        // Step 2: Index text in backend
        statuses[i].status = "indexing";
        setProgress([...statuses]);
        await uploadPDF(file, projectId, token);

        statuses[i].status = "done";
        setProgress([...statuses]);
      } catch (err) {
        statuses[i].status = "error";
        statuses[i].error = err.message;
        setProgress([...statuses]);
        setError(`Failed: ${file.name} — ${err.message}`);
      }
    }

    const allDone = statuses.every((s) => s.status === "done");
    if (allDone) {
      setDone(true);
      setFiles([]);
      if (onUploadSuccess) onUploadSuccess();
    }
  };

  const statusIcon = (s) => {
    if (s === "pending") return "⏳";
    if (s === "uploading") return "📤";
    if (s === "indexing") return "🔍";
    if (s === "done") return "✅";
    if (s === "error") return "❌";
  };

  const isUploading = progress.some((p) => p.status === "uploading" || p.status === "indexing");

  return (
    <div className="space-y-4">
      <label className="block group">
        <span className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-widest block">
          Select one or more PDFs
        </span>
        <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-muted bg-card/50 hover:bg-muted/50 hover:border-primary/50 transition-all group-hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]">
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center pointer-events-none">
            <span className="text-2xl mb-2 text-muted-foreground group-hover:text-primary transition-colors">📄</span>
            <p className="text-sm font-medium text-foreground">Click to browse or drag and drop</p>
            <p className="text-xs text-muted-foreground mt-1">PDF files only (max 10MB)</p>
          </div>
        </div>
      </label>

      {/* Unified file list — always visible once files are selected */}
      {files.length > 0 && (
        <ul className="space-y-1.5 border rounded-xl p-2.5 bg-muted/20">
          {files.map((f, i) => {
            const p = progress[i];
            return (
              <li key={f.name} className="text-xs flex items-center gap-2.5 bg-card/80 px-3 py-2 rounded-lg border shadow-sm">
                <span className="text-sm">{p ? statusIcon(p.status) : "📄"}</span>
                <span className="truncate flex-1 font-medium text-card-foreground" title={f.name}>{f.name}</span>
                {p ? (
                  <span className={`text-[10px] uppercase tracking-widest font-bold shrink-0 ${p.status === "error" ? "text-destructive" :
                    p.status === "done" ? "text-foreground" :
                      "text-primary animate-pulse"
                    }`}>
                    {p.status === "uploading" ? "Uploading..." :
                      p.status === "indexing" ? "Indexing..." :
                        p.status === "done" ? "Done!" :
                          p.status === "error" ? "Failed" : ""}
                  </span>
                ) : (
                  <button
                    onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                    className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1 rounded-md transition-all font-bold focus:outline-none"
                    title="Remove from list"
                  >✕</button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {done && (
        <p className="text-xs text-foreground font-medium bg-muted/50 border border-border px-3 py-2 rounded-lg text-center">
          ✅ All PDFs uploaded & indexed!
        </p>
      )}
      {error && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg text-center break-words">{error}</p>}

      <Button
        onClick={handleUpload}
        disabled={!files.length || isUploading}
        className={`w-full h-11 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center justify-center ${!files.length || isUploading
          ? "bg-muted text-muted-foreground border-none hover:bg-muted"
          : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5"
          }`}
      >
        {isUploading
          ? <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> Uploading {progress.filter(p => p.status === "done").length}/{files.length}...</span>
          : files.length > 1
            ? `Upload ${files.length} PDFs`
            : "Upload PDF"}
      </Button>
    </div>
  );
}
