"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { ref as dbRef, get } from "firebase/database";

export default function TeamModal({ isOpen, onClose, projectId, project }) {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen || !projectId) return;

        const fetchMembers = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch members associated with this project ID
                const snap = await get(dbRef(db, `project_members/${projectId}`));

                let memberList = [];
                // Add the owner first
                const ownerInfo = {
                    uid: project?.owner_uid || "owner",
                    email: project?.owner_email || "Project Owner",
                    name: project?.owner_name || "Owner",
                    role: "Owner",
                    joined_at: project?.created_at || Date.now(),
                    isOwner: true
                };
                memberList.push(ownerInfo);

                // Add invited members
                if (snap.exists()) {
                    const data = snap.val();
                    const invitedMembers = Object.entries(data).map(([uid, info]) => ({
                        uid,
                        ...info
                    }));
                    memberList = [...memberList, ...invitedMembers];
                }

                setMembers(memberList);
            } catch (err) {
                console.error("Failed to fetch project members:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMembers();
    }, [isOpen, projectId, project]);

    const formatRole = (role) => {
        if (role === "Owner") return "🏆 Owner";
        if (role === "full") return "✍️ Full Access";
        if (role === "limited") return "👀 Limited Access";
        if (role === "viewer") return "👁️ Viewer";
        return `👤 ${role}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 relative">
            <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-8 max-h-[85vh] flex flex-col relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-primary/20 blur-[60px] pointer-events-none rounded-full" />

                <div className="flex justify-between items-center mb-6 shrink-0 relative z-10">
                    <h2 className="text-2xl font-bold flex items-center gap-3 text-foreground">
                        <span className="text-primary">👥</span> Team Members
                    </h2>
                    <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full h-10 w-10 p-0 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-4 relative z-10 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground animate-pulse gap-3">
                            <span className="text-3xl">⏳</span>
                            <p>Loading team members...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center p-4 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
                            Failed to load members: {error}
                        </div>
                    ) : members.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground italic">
                            No team members found.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {members.map((member) => (
                                <div key={member.uid} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${member.isOwner
                                    ? 'bg-primary/10 border-primary/20 shadow-sm'
                                    : 'bg-muted/50 hover:bg-muted cursor-default'
                                    }`}>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-semibold text-foreground truncate flex items-center gap-2">
                                            {member.name || "Unknown User"}
                                            {member.isOwner && <span className="text-[10px] uppercase font-black bg-primary/20 text-primary px-1.5 py-0.5 rounded-sm tracking-widest">OWNER</span>}
                                        </div>
                                        <div className="text-sm text-muted-foreground truncate mt-0.5">{member.email}</div>
                                        {member.joined_at && (
                                            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2 font-medium">
                                                Joined {new Date(member.joined_at).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="shrink-0 ml-4 flex flex-col items-end">
                                        <span className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border ${member.isOwner
                                            ? 'bg-primary/20 text-primary border-primary/30'
                                            : 'bg-muted text-muted-foreground'
                                            }`}>
                                            {formatRole(member.role)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-5 mt-2 border-t shrink-0 flex justify-between items-center relative z-10">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                        Total {members.length} {members.length === 1 ? 'member' : 'members'}
                    </div>
                    <Button
                        onClick={onClose}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 h-11 font-medium shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 transition-all outline-none border-none"
                    >
                        Done
                    </Button>
                </div>
            </div>
        </div>
    );
}
