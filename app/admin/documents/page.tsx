"use client";

import { useState } from "react";
import { DocumentUploader } from "@/components/admin/DocumentUploader";
import { DocumentList } from "@/components/admin/DocumentList";
import { Shield } from "lucide-react";

export default function AdminDocumentsPage() {
  const [trigger, setTrigger] = useState(0);
  return (
    <div className="min-h-screen bg-[#0f0f0f] p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ED1C24]">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Document Management</h1>
            <p className="text-sm text-[#8A8A8A]">Index FRC PDFs for RAG-powered answers</p>
          </div>
        </div>
        <div className="space-y-6">
          <DocumentUploader onSuccess={() => setTrigger((n) => n + 1)} />
          <div>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[#8A8A8A]">Indexed Documents</h2>
            <DocumentList refreshTrigger={trigger} />
          </div>
        </div>
      </div>
    </div>
  );
}
