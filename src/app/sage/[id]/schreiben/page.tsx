"use client";

import { useParams } from "next/navigation";
import { WritingStudio } from "@/components/WritingStudio/WritingStudio";

export default function SchreibenPage() {
  const params = useParams<{ id: string }>();
  const sagaId = typeof params?.id === "string" ? params.id : "";

  return <WritingStudio sagaId={sagaId} />;
}
