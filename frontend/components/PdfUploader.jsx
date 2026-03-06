"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { uploadPDF } from "@/lib/api";

export default function PdfUploader({ projectId, getToken, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    setStatus("Uploading...");
    setError("");
    try {
      const token = await getToken();
      await uploadPDF(file, projectId, token);
      setStatus("PDF indexed successfully ✅");
      setFile(null);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      setError(err.message || "Upload failed.");
      setStatus("");
    }
  };

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <Button onClick={handleUpload} disabled={!file || status === "Uploading..."}>
        Upload PDF
      </Button>
      {status && <p className="text-sm text-green-600">{status}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
