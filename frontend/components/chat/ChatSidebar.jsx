"use client";

import { Button } from "@/components/ui/button";

export function ChatSidebar({
    chats,
    activeChatId,
    setActiveChatId,
    startNewChat,
    deleteChat
}) {
    return (
        <div className="w-52 shrink-0 border-r flex flex-col bg-muted/20">
            <div className="p-3 border-b">
                <Button onClick={startNewChat} className="w-full" size="sm">
                    + New Chat
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {chats.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center pt-4 px-2">
                        No chats yet. Ask a question to start!
                    </p>
                )}
                {chats.map((chat) => (
                    <button
                        key={chat.id}
                        onClick={() => setActiveChatId(chat.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs truncate flex items-center justify-between gap-1 group transition-colors ${activeChatId === chat.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                            }`}
                    >
                        <span className="truncate">💬 {chat.title || "Chat"}</span>
                        <span
                            onClick={(e) => deleteChat(chat.id, e)}
                            className={`shrink-0 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity ${activeChatId === chat.id ? "text-primary-foreground" : ""
                                }`}
                            title="Delete chat"
                        >
                            🗑️
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
