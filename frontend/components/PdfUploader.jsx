"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { uploadPDF } from "@/lib/api";

export default function PdfUploader({ projectId, token, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    setStatus("Uploading...");
    await uploadPDF(file, projectId, token);
    setStatus("PDF indexed successfully");
    if (onUploadSuccess) onUploadSuccess();
  };

  return (
    <div className="space-y-3">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <Button onClick={handleUpload}>Upload PDF</Button>
      {status && <p className="text-sm text-gray-500">{status}</p>}
    </div>
  );
}
