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


export default function ChatInterface({ projectId, uid, getToken, projectFiles, ownerUid, allowedPdfs = [], onOpenShare, onOpenUploader }) {
    const [personalChats, setPersonalChats] = useState([]);
    const [groupChats, setGroupChats] = useState([]);
    // activeChatId is now an object: { id: string, type: "personal" | "group" } or null
    const [activeChatId, setActiveChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [isVoiceAssistantMode, setIsVoiceAssistantMode] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Load personal and group chats for this project
    useEffect(() => {
        if (!uid || !projectId) return;
        setActiveChatId(null);
        setMessages([]);
        setPersonalChats([]);
        setGroupChats([]);

        // Listen for Personal Chats
        const personalChatsRef = dbRef(db, `chats/personal/${uid}/${projectId}`);
        const unsubPersonal = onValue(personalChatsRef, (snap) => {
            if (snap.exists()) {
                const list = Object.entries(snap.val())
                    .map(([id, val]) => ({ id, ...val }))
                    .sort((a, b) => b.created_at - a.created_at);
                setPersonalChats(list);
            } else {
                setPersonalChats([]);
            }
        });

        // Listen for Group Chats
        const groupChatsRef = dbRef(db, `chats/group/${projectId}`);
        const unsubGroup = onValue(groupChatsRef, (snap) => {
            if (snap.exists()) {
                const list = Object.entries(snap.val())
                    .map(([id, val]) => ({ id, ...val }))
                    .sort((a, b) => b.created_at - a.created_at);
                setGroupChats(list);
            } else {
                setGroupChats([]);
            }
        });

        return () => {
            unsubPersonal();
            unsubGroup();
        };
    }, [uid, projectId]);

    // Load messages for active chat
    useEffect(() => {
        if (!activeChatId || !uid || !projectId) {
            setMessages([]);
            return;
        }

        let msgsRef;
        if (activeChatId.type === "group") {
            msgsRef = dbRef(db, `chat_messages/group/${projectId}/${activeChatId.id}`);
        } else {
            msgsRef = dbRef(db, `chat_messages/personal/${uid}/${projectId}/${activeChatId.id}`);
        }

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

    const startNewChat = (type = "personal") => {
        // Here we just prepare the UI to start a chat. It's actually created on first message.
        // We temporarily set a "ghost" active chat to let sendMessage know what type to create.
        setActiveChatId({ id: null, type });
        setMessages([]);
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const currentInput = input;
        setInput("");

        // Auto-resize textarea back
        if (textareaRef.current) textareaRef.current.style.height = "auto";

        // Create a new chat in RTDB if none is active
        // If there's no activeChatId at all, default to "personal"
        let currentType = activeChatId ? activeChatId.type : "personal";
        let chatId = activeChatId?.id;

        if (!chatId) {
            let chatsRef;
            if (currentType === "group") {
                chatsRef = dbRef(db, `chats/group/${projectId}`);
            } else {
                chatsRef = dbRef(db, `chats/personal/${uid}/${projectId}`);
            }

            const newRef = await push(chatsRef, {
                title: currentInput.slice(0, 45),
                created_at: Date.now(),
            });
            chatId = newRef.key;
            setActiveChatId({ id: chatId, type: currentType });
        }

        // Save user message to RTDB
        let msgsRef;
        if (currentType === "group") {
            msgsRef = dbRef(db, `chat_messages/group/${projectId}/${chatId}`);
        } else {
            msgsRef = dbRef(db, `chat_messages/personal/${uid}/${projectId}/${chatId}`);
        }

        await push(msgsRef, { role: "user", content: currentInput, timestamp: Date.now() });

        setLoading(true);
        // While the AI is fetching and then speaking its answer, we pause listening
        if (isVoiceAssistantMode) setIsSpeaking(true);

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

    const deleteChat = async (chatId, type, e) => {
        e.stopPropagation();
        if (!confirm("Delete this chat?")) return;

        if (type === "group") {
            await set(dbRef(db, `chats/group/${projectId}/${chatId}`), null);
            await set(dbRef(db, `chat_messages/group/${projectId}/${chatId}`), null);
        } else {
            await set(dbRef(db, `chats/personal/${uid}/${projectId}/${chatId}`), null);
            await set(dbRef(db, `chat_messages/personal/${uid}/${projectId}/${chatId}`), null);
        }

        if (activeChatId?.id === chatId) {
            setActiveChatId(null);
            setMessages([]);
        }
    };

    const deleteMessage = async (msgId) => {
        if (!confirm("Delete this single message?")) return;
        if (activeChatId.type === "group") {
            await set(dbRef(db, `chat_messages/group/${projectId}/${activeChatId.id}/${msgId}`), null);
        } else {
            await set(dbRef(db, `chat_messages/personal/${uid}/${projectId}/${activeChatId.id}/${msgId}`), null);
        }
    };

    return (
        <div className="flex h-full gap-0">
            <ChatSidebar
                personalChats={personalChats}
                groupChats={groupChats}
                activeChatId={activeChatId}
                setActiveChatId={setActiveChatId}
                startNewChat={startNewChat}
                deleteChat={deleteChat}
            />

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-muted/30">
                {/* PDF context bar */}
                {projectFiles.length > 0 && (
                    <div className="px-5 py-2.5 border-b bg-card/50 flex items-center gap-2.5 flex-wrap">
                        <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold shrink-0">Context:</span>
                        {projectFiles.map((f) => (
                            <span
                                key={f.filename}
                                className="text-xs bg-muted/80 border text-foreground rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow-sm"
                            >
                                <span className="text-primary opacity-80">📄</span> {f.filename}
                            </span>
                        ))}
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
                    {(!activeChatId || !activeChatId.id) && messages.length === 0 && (
                        <div className="space-y-6">
                            {activeChatId?.type === "group" ? (
                                <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl text-center max-w-sm mx-auto shadow-sm">
                                    <span className="text-4xl mb-3 block">👥</span>
                                    <h3 className="font-semibold text-primary">New Group Chat</h3>
                                    <p className="text-xs text-primary/60 mt-2 leading-relaxed">
                                        Messages here will be visible to everyone in the project.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-6 bg-secondary/10 border border-secondary/20 rounded-2xl text-center max-w-sm mx-auto shadow-sm">
                                    <span className="text-4xl mb-3 block">🔒</span>
                                    <h3 className="font-semibold text-secondary-foreground">New Personal Chat</h3>
                                    <p className="text-xs text-secondary-foreground/60 mt-2 leading-relaxed">
                                        Messages here are only visible to you.
                                    </p>
                                </div>
                            )}
                            <EmptyChatScreen
                                projectFiles={projectFiles}
                                setInput={setInput}
                                textareaRef={textareaRef}
                            />
                        </div>
                    )}

                    {messages.map((msg, idx) => {
                        // The newest AI message should auto-play if we are in voice mode
                        const isNewestAiMessage = msg.role === "assistant" && idx === messages.length - 1;

                        return (
                            <MessageBubble
                                key={msg.id}
                                msg={msg}
                                onDelete={() => deleteMessage(msg.id)}
                                autoPlay={isVoiceAssistantMode && isNewestAiMessage}
                                onComplete={() => {
                                    // When TTS finishes, we can resume listening automatically
                                    if (isVoiceAssistantMode) {
                                        setIsSpeaking(false);
                                    }
                                }}
                            />
                        );
                    })}

                    {loading && (
                        <div className="flex gap-3 px-4 justify-start">
                            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-sm shrink-0">
                                AI
                            </div>
                            <div className="bg-card border shadow-sm rounded-3xl rounded-tl-sm px-5 py-3.5 flex items-center gap-1.5 h-[48px]">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <ChatInput
                    input={input}
                    setInput={setInput}
                    loading={loading}
                    projectFiles={projectFiles}
                    textareaRef={textareaRef}
                    handleTextareaInput={handleTextareaInput}
                    handleKeyDown={handleKeyDown}
                    sendMessage={sendMessage}
                    isVoiceAssistantMode={isVoiceAssistantMode}
                    setIsVoiceAssistantMode={setIsVoiceAssistantMode}
                    isSpeaking={isSpeaking}
                    onOpenShare={onOpenShare}
                    onOpenUploader={onOpenUploader}
                />
            </div>
        </div>
    );
}
