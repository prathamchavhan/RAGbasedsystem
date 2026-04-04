"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";

export function ChatInput({
    input,
    setInput,
    loading,
    projectFiles,
    textareaRef,
    handleTextareaInput,
    handleKeyDown,
    sendMessage,
    isVoiceAssistantMode,
    setIsVoiceAssistantMode,
    isSpeaking,
    onOpenShare,
    onOpenUploader
}) {
    // Normal STT States
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    // Continuous Voice Assistant States
    const recognitionRef = useRef(null);
    const silenceTimeoutRef = useRef(null);
    const [isListening, setIsListening] = useState(false);

    // Continuous Listening Logic
    useEffect(() => {
        if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
            if (isVoiceAssistantMode) {
                alert("Continuous voice recognition is not supported in your browser.");
                setIsVoiceAssistantMode(false);
            }
            return;
        }

        if (isVoiceAssistantMode && !isSpeaking) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onstart = () => {
                setIsListening(true);
            };

            recognitionRef.current.onresult = (event) => {
                // Clear any existing silence timeout when user speaks
                if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

                let finalTranscript = "";
                let interimTranscript = "";

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                // If we got a final transcript, immediately apply it
                if (finalTranscript) {
                    const addedText = finalTranscript.trim();
                    const lowerText = addedText.toLowerCase();

                    // Basic stop command detection
                    if (lowerText.includes("stop listening") || lowerText === "stop" || lowerText === "goodbye") {
                        setIsVoiceAssistantMode(false);
                        return;
                    }

                    // App Control Commands
                    if (lowerText.includes("share project") || lowerText === "share") {
                        if (onOpenShare) onOpenShare();
                        setIsVoiceAssistantMode(false);
                        return;
                    }
                    if (lowerText.includes("add pdf") || lowerText.includes("upload pdf")) {
                        if (onOpenUploader) onOpenUploader();
                        setIsVoiceAssistantMode(false);
                        return;
                    }

                    setInput((prev) => prev ? prev + " " + addedText : addedText);
                }

                // Restart the silence timer: if 2000ms passes without a new result, send message
                silenceTimeoutRef.current = setTimeout(() => {
                    const evt = new CustomEvent("autoSendChatMessage");
                    window.dispatchEvent(evt);
                }, 2000);
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                if (event.error === 'not-allowed') {
                    setIsVoiceAssistantMode(false);
                }
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
                // If still in mode and not speaking, try restarting
                if (isVoiceAssistantMode && !loading && !isSpeaking) {
                    try { recognitionRef.current.start(); } catch (e) { }
                }
            };

            // Start listening
            if (!loading && !isSpeaking) {
                try { recognitionRef.current.start(); } catch (e) {
                    console.error("Failed to start recognition:", e);
                }
            }
        } else {
            // Stop voice mode naturally or temporarily if speaking
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) { }
            }
            setIsListening(false);
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        }

        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) { }
            }
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        };
    }, [isVoiceAssistantMode, loading, isSpeaking]);

    // Listener for the silence timeout custom event
    useEffect(() => {
        const handleAutoSend = () => {
            // We use a functional approach to check current input so we don't rely on stale closure
            setInput(currentInput => {
                if (currentInput.trim() && !loading) {
                    // Directly call sendMessage since it doesn't take arguments
                    sendMessage();
                }
                return currentInput;
            });
        };
        window.addEventListener("autoSendChatMessage", handleAutoSend);
        return () => window.removeEventListener("autoSendChatMessage", handleAutoSend);
    }, [sendMessage, loading]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
                stream.getTracks().forEach(track => track.stop());
                await transcribeAudio(audioBlob);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsTranscribing(true);
        }
    };

    const transcribeAudio = async (audioBlob) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error("Not authenticated");

            const formData = new FormData();
            formData.append("file", audioBlob, "audio.webm");

            const res = await fetch("http://localhost:8000/transcribe", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) throw new Error("Transcription failed");

            const data = await res.json();
            if (data.text) {
                // Append text, or replace if empty
                setInput((prev) => prev ? prev + " " + data.text : data.text);
            }
        } catch (error) {
            console.error("Transcription error:", error);
            alert("Error transcribing audio. Please try again.");
        } finally {
            setIsTranscribing(false);
        }
    };
    return (
        <div className="border-t p-4 bg-background/80 backdrop-blur-xl">
            <div className="flex gap-2 items-end max-w-4xl mx-auto relative group">
                <textarea
                    ref={textareaRef}
                    rows={1}
                    placeholder={
                        projectFiles.length > 0
                            ? isVoiceAssistantMode
                                ? "✨ Voice Assistant Active... Speak a question or say 'stop'."
                                : isRecording
                                    ? "Listening..."
                                    : isTranscribing
                                        ? "Transcribing..."
                                        : "Ask about your PDFs... (Enter to send, Shift+Enter for new line)"
                            : "Upload a PDF first..."
                    }
                    disabled={loading || projectFiles.length === 0 || isTranscribing || isVoiceAssistantMode}
                    value={input}
                    onChange={handleTextareaInput}
                    onKeyDown={handleKeyDown}
                    className={`flex-1 resize-none rounded-2xl border px-5 py-3.5 text-sm outline-none transition-all duration-200 disabled:opacity-50 min-h-[52px] max-h-40 overflow-y-auto shadow-sm ${isVoiceAssistantMode
                        ? 'bg-primary/10 border-primary/30 text-primary placeholder:text-primary/50'
                        : 'bg-muted/50 border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary/50 focus:ring-1 focus:ring-primary/50'
                        }`}
                    style={{ height: "52px" }}
                />

                {/* ✨ Voice Assistant Continuous Mode Toggle Button */}
                <Button
                    onClick={() => setIsVoiceAssistantMode(!isVoiceAssistantMode)}
                    disabled={projectFiles.length === 0 || isRecording || isTranscribing}
                    variant={isVoiceAssistantMode ? "default" : "outline"}
                    className={`h-[52px] w-[52px] rounded-2xl shrink-0 p-0 text-lg transition-all border-none ${isVoiceAssistantMode && isListening
                        ? "animate-pulse bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/50"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground opacity-80 hover:opacity-100"
                        }`}
                    title={isVoiceAssistantMode ? "Stop Voice Assistant" : "Start Voice Assistant Mode"}
                >
                    ✨
                </Button>

                {/* 🎤 Manual Voice Input Button */}
                {!isVoiceAssistantMode && (
                    <Button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={loading || projectFiles.length === 0 || isTranscribing}
                        className={`h-[52px] w-[52px] rounded-2xl shrink-0 p-0 text-lg transition-all border-none ${isRecording
                            ? "animate-pulse bg-destructive/20 text-destructive hover:bg-destructive/30"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground opacity-80 hover:opacity-100"
                            }`}
                        title={isRecording ? "Stop Recording" : "Voice Input"}
                    >
                        {isRecording ? "⏹️" : "🎤"}
                    </Button>
                )}

                {!isVoiceAssistantMode && (
                    <Button
                        onClick={sendMessage}
                        disabled={!input.trim() || loading || projectFiles.length === 0 || isRecording || isTranscribing}
                        className={`h-[52px] w-[52px] rounded-2xl shrink-0 p-0 text-lg transition-all border-none ${!input.trim() || loading || projectFiles.length === 0 || isRecording || isTranscribing
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:-translate-y-0.5"
                            }`}
                        title="Send"
                    >
                        {loading ? <span className="animate-spin text-sm">⏳</span> : "➤"}
                    </Button>
                )}
            </div>
            <p className="text-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-4 mb-1">
                Answers are  based on your uploaded PDFs only
            </p>
        </div>
    );
}
