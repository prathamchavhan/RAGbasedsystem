"use client";

import { useState, useEffect } from "react";
import { MermaidDiagram } from "./MermaidDiagram";

// Strips markdown from text before reading it aloud
function stripMarkdown(text) {
    return text.replace(/```[\s\S]*?```/g, "") // remove code blocks
        .replace(/[*_#`~]+/g, "")             // remove markdown formatting chars
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // remove markdown links but keep text
        .trim();
}

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

export function MessageBubble({ msg, onDelete, autoPlay, onComplete }) {
    const isUser = msg.role === "user";
    const parts = parseMessageContent(msg.content);
    const hasDiagram = parts.some((p) => p.type === "mermaid");
    const [isPlaying, setIsPlaying] = useState(false);

    // Track if autoPlay has already happened to prevent looping on re-renders
    const [hasAutoPlayed, setHasAutoPlayed] = useState(false);

    useEffect(() => {
        if (!isUser && autoPlay && !hasAutoPlayed) {
            setHasAutoPlayed(true);
            playAudio();
        }
    }, [autoPlay, isUser, hasAutoPlayed]);

    const playAudio = () => {
        if (!("speechSynthesis" in window)) {
            alert("Text-to-Speech is not supported in this browser.");
            return;
        }

        if (isPlaying || window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
            return;
        }

        const textToRead = stripMarkdown(msg.content);
        if (!textToRead) return;

        const utterance = new SpeechSynthesisUtterance(textToRead);

        // Required to prevent garbage collection bug in some browsers (Chrome/Safari)
        window.utterances = window.utterances || [];
        window.utterances.push(utterance);

        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => {
            setIsPlaying(false);
            if (onComplete) onComplete();
        };
        utterance.onerror = (e) => {
            console.error("Speech synthesis error:", e.error, e);
            setIsPlaying(false);
            if (onComplete) onComplete();
        };

        // Sometimes play fails if an old instance was left halted
        window.speechSynthesis.cancel();

        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
            // Resume fixing another known Safari/Chrome bug where audio just stalls
            window.speechSynthesis.resume();
        }, 50);
    };

    return (
        <div className={`flex gap-3 px-4 py-2 ${isUser ? "justify-end" : "justify-start"}`}>
            {!isUser && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm shrink-0 mt-1 shadow-sm border border-primary/30 font-medium">
                    {hasDiagram ? "📊" : "AI"}
                </div>
            )}
            <div
                className={`relative group rounded-3xl px-5 py-3.5 text-sm leading-relaxed shadow-sm transition-all ${isUser
                    ? "max-w-[85%] bg-primary text-primary-foreground rounded-tr-sm whitespace-pre-wrap ml-12"
                    : hasDiagram
                        ? "w-full max-w-3xl bg-card border rounded-tl-sm text-card-foreground"
                        : "max-w-[85%] bg-card text-card-foreground rounded-tl-sm border whitespace-pre-wrap shadow-black/20"
                    }`}
            >
                {/* Embedded Delete Button */}
                <button
                    onClick={onDelete}
                    className={`absolute -bottom-2 ${isUser ? "-left-2" : "-right-2"} 
                    bg-muted border shadow-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 
                    w-7 h-7 rounded-full flex items-center justify-center transition-all z-10 opacity-0 group-hover:opacity-100`}
                    title="Delete message"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                </button>

                {/* TTS Play Button for AI Messages */}
                {!isUser && (
                    <button
                        onClick={playAudio}
                        className={`absolute -bottom-2 -left-2
                        bg-muted border shadow-sm text-primary hover:text-primary/80 hover:bg-primary/10 
                        w-7 h-7 rounded-full flex items-center justify-center transition-all z-10 opacity-0 group-hover:opacity-100`}
                        title={isPlaying ? "Stop speech" : "Read aloud"}
                    >
                        {isPlaying ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                        )}
                    </button>
                )}

                {parts.map((part, i) =>
                    part.type === "mermaid" ? (
                        <div key={i} className="my-3 rounded-xl overflow-hidden border bg-muted/30 p-2">
                            <MermaidDiagram code={part.value} />
                        </div>
                    ) : (
                        <span key={i} className="whitespace-pre-wrap block pb-1 selection:bg-primary/30 leading-relaxed font-light">{part.value}</span>
                    )
                )}
            </div>
            {isUser && (
                <div className="w-8 h-8 rounded-full bg-muted border flex items-center justify-center text-sm shrink-0 mt-1 shadow-sm">
                    👤
                </div>
            )}
        </div>
    );
}
