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
    <div className="space-y-3">
      <label className="block">
        <span className="text-xs text-muted-foreground mb-1 block">
          Select one or more PDFs
        </span>
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileChange}
          className="block w-full text-sm text-muted-foreground
            file:mr-3 file:py-1.5 file:px-3
            file:rounded-md file:border-0
            file:text-sm file:font-medium
            file:bg-muted file:text-foreground
            hover:file:bg-muted/70 cursor-pointer"
        />
      </label>

      {/* Unified file list — always visible once files are selected */}
      {files.length > 0 && (
        <ul className="space-y-1 border rounded-md p-2 bg-muted/30">
          {files.map((f, i) => {
            const p = progress[i];
            return (
              <li key={f.name} className="text-xs flex items-center gap-2">
                <span>{p ? statusIcon(p.status) : "📄"}</span>
                <span className="truncate flex-1 font-medium" title={f.name}>{f.name}</span>
                {p ? (
                  <span className="text-muted-foreground shrink-0">
                    {p.status === "uploading" ? "Uploading..." :
                      p.status === "indexing" ? "Indexing..." :
                        p.status === "done" ? "Done!" :
                          p.status === "error" ? "Failed" : ""}
                  </span>
                ) : (
                  <button
                    onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                    className="shrink-0 text-muted-foreground hover:text-red-500 transition font-bold"
                    title="Remove from list"
                  >✕</button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {done && (
        <p className="text-xs text-green-600 font-medium">
          ✅ All PDFs uploaded & indexed!
        </p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}

      <Button
        onClick={handleUpload}
        disabled={!files.length || isUploading}
        className="w-full"
      >
        {isUploading
          ? `Uploading ${progress.filter(p => p.status === "done").length}/${files.length}...`
          : files.length > 1
            ? `Upload ${files.length} PDFs`
            : "Upload PDF"}
      </Button>
    </div>
  );
}
