"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askQuestion } from "@/lib/api";

export default function ChatBox({ projectId, getToken }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      const res = await askQuestion(question, projectId, token);
      setAnswer(res.answer);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold mb-4">Ask a Question</h3>
      <Input
        placeholder="Ask a question from the PDF..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAsk()}
      />
      <Button onClick={handleAsk} disabled={loading}>
        {loading ? "Thinking..." : "Ask"}
      </Button>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {answer && (
        <div className="p-4 border rounded-md bg-muted">
          <strong>Answer:</strong>
          <p className="mt-1">{answer}</p>
        </div>
      )}
    </div>
  );
}
