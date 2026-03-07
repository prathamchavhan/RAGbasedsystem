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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border rounded-xl shadow-lg w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-4">Share Project</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Access Level</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full border rounded-lg p-2 text-sm bg-background outline-none"
                        >
                            <option value="full">Full Access (Can upload, delete, invite, see all PDFs)</option>
                            <option value="limited">Limited Access (Can only chat with selected PDFs)</option>
                        </select>
                    </div>

                    {role === "limited" && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Select PDFs they can access:</label>
                            <div className="border rounded-lg max-h-40 overflow-y-auto p-2 space-y-2">
                                {projectFiles.map(f => (
                                    <label key={f.filename} className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedPdfs.includes(f.filename)}
                                            onChange={() => togglePdf(f.filename)}
                                        />
                                        <span className="truncate">{f.filename}</span>
                                    </label>
                                ))}
                                {projectFiles.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic">No PDFs in this project</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 justify-end pt-4 mt-6 border-t">
                        <Button variant="outline" onClick={onClose} className="bg-muted">Cancel</Button>
                        <Button onClick={handleCreateLink} disabled={role === "limited" && selectedPdfs.length === 0}>
                            Create & Send Invite
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
