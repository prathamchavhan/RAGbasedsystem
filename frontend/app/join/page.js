"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth, db, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signInWithRedirect, onAuthStateChanged } from "firebase/auth";
import { ref as dbRef, get, set } from "firebase/database";
import { Button } from "@/components/ui/button";

export default function JoinProject() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const projectId = searchParams.get("project");
    const ownerUid = searchParams.get("owner");
    const projectName = searchParams.get("name");
    const role = searchParams.get("role") || "viewer";

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const loginWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            if (error.code === "auth/popup-blocked" || error.code === "auth/popup-cancelled") {
                await signInWithRedirect(auth, googleProvider);
            }
        }
    };

    const joinProject = async () => {
        if (!user || !projectId || !ownerUid) return;

        try {
            // Add project to user's projects list as a shared project
            const projectData = {
                name: projectName || "Shared Project",
                is_shared: true,
                owner_uid: ownerUid,
                role: role,
                joined_at: Date.now(),
                // to make it consistent with normal projects, we store an id
            };

            await set(dbRef(db, `projects/${user.uid}/${projectId}`), projectData);

            // Also record member in project_members
            await set(dbRef(db, `project_members/${projectId}/${user.uid}`), {
                email: user.email,
                name: user.displayName,
                role: role,
                joined_at: Date.now()
            });

            alert("Successfully joined the project!");
            router.push("/");
        } catch (err) {
            setError("Failed to join: " + err.message);
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

    if (!projectId || !ownerUid) {
        return <div className="p-8 text-center text-red-500 font-medium">Invalid invitation link. Missing project or owner ID.</div>;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-6 max-w-sm p-8 border rounded-xl shadow-sm bg-white">
                <div className="text-5xl">🤝</div>
                <h1 className="text-2xl font-bold">You've been invited!</h1>
                <p className="text-muted-foreground text-sm">
                    You have been invited to join the PDF project <br />
                    <strong className="text-foreground text-base">"{projectName}"</strong> <br />
                    as a <strong>{role}</strong>.
                </p>

                {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                {!user ? (
                    <div className="space-y-3 pt-6 border-t mt-4">
                        <p className="text-xs text-muted-foreground">Sign in to accept the invitation</p>
                        <Button onClick={loginWithGoogle} className="w-full">Sign in with Google</Button>
                    </div>
                ) : (
                    <div className="space-y-3 pt-6 border-t mt-4">
                        <p className="text-xs text-muted-foreground">Logged in as {user.email}</p>
                        <Button onClick={joinProject} className="w-full" size="lg">Accept & Join</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
