"use client";

import { Button } from "@/components/ui/button";

export function ChatInput({
    input,
    setInput,
    loading,
    projectFiles,
    textareaRef,
    handleTextareaInput,
    handleKeyDown,
    sendMessage
}) {
    return (
        <div className="border-t p-4 bg-background">
            <div className="flex gap-2 items-end max-w-4xl mx-auto">
                <textarea
                    ref={textareaRef}
                    rows={1}
                    placeholder={
                        projectFiles.length > 0
                            ? "Ask about your PDFs... (Enter to send, Shift+Enter for new line)"
                            : "Upload a PDF first..."
                    }
                    disabled={loading || projectFiles.length === 0}
                    value={input}
                    onChange={handleTextareaInput}
                    onKeyDown={handleKeyDown}
                    className="flex-1 resize-none rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 min-h-[48px] max-h-40 overflow-y-auto"
                    style={{ height: "48px" }}
                />
                <Button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading || projectFiles.length === 0}
                    className="h-12 w-12 rounded-xl shrink-0 p-0 text-lg"
                    title="Send"
                >
                    {loading ? "⏳" : "➤"}
                </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">
                Answers are based on your uploaded PDFs only
            </p>
        </div>
    );
}
