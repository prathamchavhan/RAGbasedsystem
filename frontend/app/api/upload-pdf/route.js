import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");
        const uid = formData.get("uid");
        const projectId = formData.get("project_id");

        if (!file || !uid || !projectId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Upload to Vercel Blob — file is publicly readable via URL
        const blob = await put(`pdfs/${uid}/${projectId}/${file.name}`, file, {
            access: "public",
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        return NextResponse.json({ url: blob.url, filename: file.name });
    } catch (err) {
        console.error("Blob upload error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
