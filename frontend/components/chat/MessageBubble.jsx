"use client";

import { MermaidDiagram } from "./MermaidDiagram";

// Splits message content into text and mermaid diagram parts
function parseMessageContent(content) {
    const parts = [];
    const regex = /```mermaid\n([\s\S]*?)```/g;
    let last = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
        if (match.index > last) parts.push({ type: "text", value: content.slice(last, match.index) });
        parts.push({ type: "mermaid", value: match[1] });
        last = match.index + match[0].length;
    }
    if (last < content.length) parts.push({ type: "text", value: content.slice(last) });
    return parts.length > 0 ? parts : [{ type: "text", value: content }];
}

export function MessageBubble({ msg, onDelete }) {
    const isUser = msg.role === "user";
    const parts = parseMessageContent(msg.content);
    const hasDiagram = parts.some((p) => p.type === "mermaid");

    return (
        <div className={`flex gap-3 px-2 py-1 ${isUser ? "justify-end" : "justify-start"}`}>
            {!isUser && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm shrink-0 mt-1 shadow-sm border border-primary/20">
                    {hasDiagram ? "📊" : "🤖"}
                </div>
            )}
            <div
                className={`relative group rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${isUser
                    ? "max-w-[85%] bg-primary text-primary-foreground rounded-tr-sm whitespace-pre-wrap"
                    : hasDiagram
                        ? "w-full max-w-2xl bg-muted border rounded-tl-sm"
                        : "max-w-[85%] bg-background text-foreground rounded-tl-sm border whitespace-pre-wrap"
                    }`}
            >
                {/* Embedded Delete Button */}
                <button
                    onClick={onDelete}
                    className={`absolute -bottom-2 ${isUser ? "-left-2" : "-right-2"} 
                    bg-background border shadow-sm text-muted-foreground hover:text-red-500 
                    w-7 h-7 rounded-full flex items-center justify-center transition-all z-10`}
                    title="Delete message"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                </button>

                {parts.map((part, i) =>
                    part.type === "mermaid" ? (
                        <MermaidDiagram key={i} code={part.value} />
                    ) : (
                        <span key={i} className="whitespace-pre-wrap block pb-1">{part.value}</span>
                    )
                )}
            </div>
            {isUser && (
                <div className="w-8 h-8 rounded-full bg-muted border flex items-center justify-center text-sm shrink-0 mt-1">
                    👤
                </div>
            )}
        </div>
    );
}
