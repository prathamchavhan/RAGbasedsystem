"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askQuestion } from "@/lib/api";

export default function ChatBox() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question) return;
    setLoading(true);
    const res = await askQuestion(question);
    setAnswer(res.answer);
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <Input
        placeholder="Ask a question from the PDF..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <Button onClick={handleAsk}>
        {loading ? "Thinking..." : "Ask"}
      </Button>

      {answer && (
        <div className="p-4 border rounded-md bg-muted">
          <strong>Answer:</strong>
          <p className="mt-1">{answer}</p>
        </div>
      )}
    </div>
  );
}
