"use client";

import { useState } from "react";

// Renders a mermaid code block as a diagram image via mermaid.ink (free, no npm)
export function MermaidDiagram({ code }) {
    const [error, setError] = useState(false);
    const encoded = typeof window !== "undefined"
        ? btoa(unescape(encodeURIComponent(code.trim())))
        : "";
    const imgUrl = `https://mermaid.ink/img/${encoded}?bgColor=ffffff`;
    const svgUrl = `https://mermaid.ink/svg/${encoded}`;

    if (error) {
        return (
            <div className="mt-2">
                <p className="text-xs text-red-500 mb-1">⚠️ Diagram render failed. Raw code:</p>
                <pre className="text-xs bg-background border rounded p-2 overflow-x-auto whitespace-pre">{code}</pre>
            </div>
        );
    }

    return (
        <div className="mt-2 space-y-2">
            <div className="border rounded-xl overflow-hidden bg-white">
                <img
                    src={imgUrl}
                    alt="Diagram"
                    className="max-w-full w-full"
                    onError={() => setError(true)}
                />
            </div>
            <div className="flex gap-2">
                <a
                    href={svgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 rounded border hover:bg-muted transition"
                >
                    🔗 Open full diagram
                </a>
                <a
                    href={imgUrl}
                    download="diagram.png"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 rounded border hover:bg-muted transition"
                >
                    ⬇️ Download PNG
                </a>
            </div>
        </div>
    );
}
