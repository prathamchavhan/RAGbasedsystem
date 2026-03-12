"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ShareModal({ isOpen, onClose, project, projectFiles, user }) {
    const [role, setRole] = useState("full");
    const [selectedPdfs, setSelectedPdfs] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setRole("full");
            setSelectedPdfs(projectFiles.map(f => f.filename));
        }
    }, [isOpen, projectFiles]);

    const togglePdf = (filename) => {
        if (selectedPdfs.includes(filename)) {
            setSelectedPdfs(selectedPdfs.filter(f => f !== filename));
        } else {
            setSelectedPdfs([...selectedPdfs, filename]);
        }
    };

    const handleCreateLink = () => {
        const pdfsParam = role === "limited" ? selectedPdfs.join(",") : "";
        const inviteLink = `${window.location.origin}/join?project=${project.id}&owner=${project.owner_uid || user.uid}&name=${encodeURIComponent(project.name)}&role=${role}&pdfs=${encodeURIComponent(pdfsParam)}`;

        const subject = `Invitation to join PDF project: ${project.name}`;
        const body = `Hello!\n\nI am inviting you to join my PDF Chat project "${project.name}".\n\nClick the link below to accept the invitation and access the project:\n${inviteLink}\n\nBest regards,\n${user.displayName || user.email || "PDF Chat User"}`;

        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        navigator.clipboard.writeText(inviteLink);
        alert("Invitation link created!\n\nYour email app has been opened to send it. The link has also been copied to your clipboard so you can manually paste it anywhere.");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 transform transition-all relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-primary/10 blur-[60px] pointer-events-none rounded-full" />

                <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                    <span className="text-primary">🔗</span> Share Project
                </h2>

                <div className="space-y-6 relative z-10">
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-card-foreground">Access Level</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full border rounded-xl p-3 text-sm bg-muted text-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all appearance-none cursor-pointer"
                        >
                            <option value="full">Full Access (Upload, delete, invite, see all)</option>
                            <option value="limited">Limited Access (Chat with selected PDFs only)</option>
                        </select>
                    </div>

                    {role === "limited" && (
                        <div>
                            <label className="block text-sm font-semibold mb-3 text-card-foreground">Select allowed PDFs:</label>
                            <div className="border rounded-xl max-h-48 overflow-y-auto p-3 space-y-2 bg-muted/30">
                                {projectFiles.map(f => (
                                    <label key={f.filename} className="flex items-center gap-3 text-sm cursor-pointer p-2 hover:bg-muted rounded-lg transition-colors group">
                                        <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0">
                                            <input
                                                type="checkbox"
                                                checked={selectedPdfs.includes(f.filename)}
                                                onChange={() => togglePdf(f.filename)}
                                                className="peer appearance-none w-5 h-5 rounded border border-muted-foreground checked:bg-primary checked:border-primary bg-muted transition-all cursor-pointer"
                                            />
                                            <svg className="absolute opacity-0 peer-checked:opacity-100 pointer-events-none text-primary-foreground w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </div>
                                        <span className="truncate text-card-foreground group-hover:text-foreground transition-colors">{f.filename}</span>
                                    </label>
                                ))}
                                {projectFiles.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic text-center py-4">No PDFs in this project</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 justify-end pt-6 mt-2 border-t">
                        <Button variant="outline" onClick={onClose} className="bg-transparent border text-foreground hover:bg-muted rounded-xl px-5 h-11">Cancel</Button>
                        <Button
                            onClick={handleCreateLink}
                            disabled={role === "limited" && selectedPdfs.length === 0}
                            className={`rounded-xl px-6 h-11 font-medium transition-all ${role === "limited" && selectedPdfs.length === 0
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:-translate-y-0.5"
                                }`}
                        >
                            Create & Send Invite
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
