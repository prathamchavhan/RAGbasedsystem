import { del } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { url } = await request.json();
        if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

        await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Blob delete error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
