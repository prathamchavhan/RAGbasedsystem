"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { ref as dbRef, push, get, onValue, set } from "firebase/database";
import { Button } from "@/components/ui/button";
import { askQuestion } from "@/lib/api";


import { MessageBubble } from "./chat/MessageBubble";
import { ChatSidebar } from "./chat/ChatSidebar";
import { ChatInput } from "./chat/ChatInput";
import { EmptyChatScreen } from "./chat/EmptyChatScreen";


export default function ChatInterface({ projectId, uid, getToken, projectFiles, ownerUid, allowedPdfs = [] }) {
    const [chats, setChats] = useState([]);
    const [activeChatId, setActiveChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Load chats for this project
    useEffect(() => {
        if (!uid || !projectId) return;
        setActiveChatId(null);
        setMessages([]);
        setChats([]);

        const chatsRef = dbRef(db, `chats/${uid}/${projectId}`);
        const unsub = onValue(chatsRef, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                const list = Object.entries(data)
                    .map(([id, val]) => ({ id, ...val }))
                    .sort((a, b) => b.created_at - a.created_at);
                setChats(list);
            } else {
                setChats([]);
            }
        });
        return () => unsub();
    }, [uid, projectId]);

    // Load messages for active chat
    useEffect(() => {
        if (!activeChatId || !uid || !projectId) {
            setMessages([]);
            return;
        }
        const msgsRef = dbRef(db, `chat_messages/${uid}/${projectId}/${activeChatId}`);
        const unsub = onValue(msgsRef, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                const list = Object.entries(data)
                    .map(([id, val]) => ({ id, ...val }))
                    .sort((a, b) => a.timestamp - b.timestamp);
                setMessages(list);
            } else {
                setMessages([]);
            }
        });
        return () => unsub();
    }, [activeChatId, uid, projectId]);

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const startNewChat = () => {
        setActiveChatId(null);
        setMessages([]);
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const currentInput = input;
        setInput("");

        // Auto-resize textarea back
        if (textareaRef.current) textareaRef.current.style.height = "auto";

        // Create a new chat in RTDB if none is active
        let chatId = activeChatId;
        if (!chatId) {
            const chatsRef = dbRef(db, `chats/${uid}/${projectId}`);
            const newRef = await push(chatsRef, {
                title: currentInput.slice(0, 45),
                created_at: Date.now(),
            });
            chatId = newRef.key;
            setActiveChatId(chatId);
        }

        // Save user message to RTDB
        const msgsRef = dbRef(db, `chat_messages/${uid}/${projectId}/${chatId}`);
        await push(msgsRef, { role: "user", content: currentInput, timestamp: Date.now() });

        setLoading(true);
        try {
            const token = await getToken();
            // Send last 6 messages as history for context-aware Q&A
            const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
            const res = await askQuestion(currentInput, projectId, token, history, ownerUid, allowedPdfs);

            await push(msgsRef, { role: "assistant", content: res.answer, timestamp: Date.now() });
        } catch (err) {
            await push(msgsRef, {
                role: "assistant",
                content: "⚠️ Sorry, something went wrong: " + err.message,
                timestamp: Date.now(),
            });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleTextareaInput = (e) => {
        setInput(e.target.value);
        // Auto-grow textarea
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
    };

    const deleteChat = async (chatId, e) => {
        e.stopPropagation();
        if (!confirm("Delete this chat?")) return;
        await set(dbRef(db, `chats/${uid}/${projectId}/${chatId}`), null);
        await set(dbRef(db, `chat_messages/${uid}/${projectId}/${chatId}`), null);
        if (activeChatId === chatId) {
            setActiveChatId(null);
            setMessages([]);
        }
    };

    const deleteMessage = async (msgId) => {
        if (!confirm("Delete this single message?")) return;
        await set(dbRef(db, `chat_messages/${uid}/${projectId}/${activeChatId}/${msgId}`), null);
    };

    return (
        <div className="flex h-full gap-0">
            <ChatSidebar
                chats={chats}
                activeChatId={activeChatId}
                setActiveChatId={setActiveChatId}
                startNewChat={startNewChat}
                deleteChat={deleteChat}
            />

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* PDF context bar */}
                {projectFiles.length > 0 && (
                    <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground font-medium shrink-0">Context:</span>
                        {projectFiles.map((f) => (
                            <span
                                key={f.filename}
                                className="text-xs bg-background border rounded-full px-2 py-0.5 flex items-center gap-1"
                            >
                                📄 {f.filename}
                            </span>
                        ))}
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {!activeChatId && messages.length === 0 && (
                        <EmptyChatScreen
                            projectFiles={projectFiles}
                            setInput={setInput}
                            textareaRef={textareaRef}
                        />
                    )}

                    {messages.map((msg) => (
                        <MessageBubble key={msg.id} msg={msg} onDelete={() => deleteMessage(msg.id)} />
                    ))}

                    {loading && (
                        <div className="flex gap-3 justify-start">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm shrink-0">
                                🤖
                            </div>
                            <div className="bg-muted border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                                <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input bar */}
                <ChatInput
                    input={input}
                    setInput={setInput}
                    loading={loading}
                    projectFiles={projectFiles}
                    textareaRef={textareaRef}
                    handleTextareaInput={handleTextareaInput}
                    handleKeyDown={handleKeyDown}
                    sendMessage={sendMessage}
                />
            </div>
        </div>
    );
}
