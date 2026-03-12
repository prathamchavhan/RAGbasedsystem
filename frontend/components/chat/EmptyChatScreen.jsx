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
        <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-4 min-h-[400px]">
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.15)] mb-2">
                <span className="text-4xl filter drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]">🤖</span>
            </div>
            <div>
                <p className="font-semibold text-lg text-foreground">Ask anything about your PDFs</p>
                <p className="text-sm mt-1.5 text-muted-foreground max-w-[250px] mx-auto leading-relaxed">
                    {projectFiles.length > 0
                        ? `${projectFiles.length} PDF(s) loaded — ask a question below`
                        : "Upload a PDF from the sidebar to get started"}
                </p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6 w-full max-w-[450px]">
                {suggestions.map((s) => (
                    <button
                        key={s}
                        onClick={() => handleSuggestionClick(s)}
                        className="text-[13px] border bg-card/50 rounded-xl p-3.5 hover:bg-primary/10 hover:border-primary/30 hover:text-primary text-card-foreground transition-all text-left shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
}
