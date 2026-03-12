"use client";

import { Button } from "@/components/ui/button";

export function ChatSidebar({
    personalChats,
    groupChats,
    activeChatId,
    setActiveChatId,
    startNewChat,
    deleteChat
}) {
    return (
        <div className="w-56 shrink-0 border-r flex flex-col bg-muted/20 backdrop-blur-md">
            <div className="p-4 border-b space-y-3">
                <Button onClick={() => startNewChat("group")} className="w-full bg-primary text-primary-foreground hover:bg-primary/90" size="sm" variant="default">
                    + New Group Chat
                </Button>
                <Button onClick={() => startNewChat("personal")} className="w-full bg-transparent border-input text-foreground hover:bg-muted" size="sm" variant="outline">
                    + New Personal Chat
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-6">
                {personalChats.length === 0 && groupChats.length === 0 && (
                    <p className="text-xs text-zinc-500 text-center pt-6 px-2">
                        No chats yet. Ask a question to start!
                    </p>
                )}

                {/* Group Chats Section */}
                {groupChats.length > 0 && (
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-muted-foreground px-2 pb-1 uppercase tracking-widest">Group Chats</p>
                        {groupChats.map((chat) => (
                            <button
                                key={chat.id}
                                onClick={() => setActiveChatId({ id: chat.id, type: "group" })}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm truncate flex items-center justify-between gap-2 group transition-all duration-200 ${activeChatId?.id === chat.id
                                    ? "bg-primary/15 text-primary font-medium border border-primary/20 shadow-inner"
                                    : "hover:bg-muted text-muted-foreground border border-transparent"
                                    }`}
                            >
                                <span className="truncate flex items-center gap-2">
                                    <span className="text-primary">👥</span> {chat.title || "Group Chat"}
                                </span>
                                <span
                                    onClick={(e) => deleteChat(chat.id, "group", e)}
                                    className={`shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-all ${activeChatId?.id === chat.id ? "text-primary" : "text-muted-foreground"
                                        }`}
                                    title="Delete group chat"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Personal Chats Section */}
                {personalChats.length > 0 && (
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-muted-foreground px-2 pb-1 uppercase tracking-widest pt-2">Personal Chats</p>
                        {personalChats.map((chat) => (
                            <button
                                key={chat.id}
                                onClick={() => setActiveChatId({ id: chat.id, type: "personal" })}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm truncate flex items-center justify-between gap-2 group transition-all duration-200 ${activeChatId?.id === chat.id
                                    ? "bg-secondary/15 text-secondary-foreground font-medium border border-secondary/20 shadow-inner"
                                    : "hover:bg-muted text-muted-foreground border border-transparent"
                                    }`}
                            >
                                <span className="truncate flex items-center gap-2">
                                    <span className="text-secondary-foreground">🔒</span> {chat.title || "Personal Chat"}
                                </span>
                                <span
                                    onClick={(e) => deleteChat(chat.id, "personal", e)}
                                    className={`shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-all ${activeChatId?.id === chat.id ? "text-secondary-foreground" : "text-muted-foreground"
                                        }`}
                                    title="Delete personal chat"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
