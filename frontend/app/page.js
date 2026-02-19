import PdfUploader from "@/components/PdfUploader";
import ChatBox from "@/components/ChatBox";

export default function Home() {
  return (
    <main className="max-w-2xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold text-center">
        📄 PDF Chat App (RAG)
      </h1>

      <PdfUploader />
      <ChatBox />
    </main>
  );
}
