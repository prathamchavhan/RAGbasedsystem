"use client";

export function EmptyChatScreen({ projectFiles, setInput, textareaRef }) {
    const suggestions = [
        "Summarize this document",
        "Make a flowchart of the process",
        "Create a mind map of topics",
        "What are the key points?"
    ];

    const handleSuggestionClick = (suggestionText) => {
        setInput(suggestionText);
        textareaRef.current?.focus();
    };

    return (
        <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3 min-h-[300px]">
            <div className="text-5xl">🤖</div>
            <div>
                <p className="font-semibold text-foreground">Ask anything about your PDFs</p>
                <p className="text-sm mt-1">
                    {projectFiles.length > 0
                        ? `${projectFiles.length} PDF(s) loaded — ask a question below`
                        : "Upload a PDF from the sidebar to get started"}
                </p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-sm">
                {suggestions.map((s) => (
                    <button
                        key={s}
                        onClick={() => handleSuggestionClick(s)}
                        className="text-xs border rounded-lg p-2 hover:bg-muted transition text-left"
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
}
