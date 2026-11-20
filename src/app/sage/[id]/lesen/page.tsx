"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Saga } from "@/data/sagen-catalog";
import { SpeechReader } from "@/components/SpeechReader/SpeechReader";
import {
  findSagaById,
  loadCustomSagas,
  markSagaRead,
} from "@/lib/local-store";

export default function LesenPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sagaId = typeof params?.id === "string" ? params.id : "";

  const [loaded, setLoaded] = useState(false);
  const [saga, setSaga] = useState<Saga | null>(null);
  const [customSagas, setCustomSagas] = useState<Saga[]>([]);

  useEffect(() => {
    const customs = loadCustomSagas();
    setCustomSagas(customs);
    const found = findSagaById(sagaId, customs) ?? null;
    setSaga(found);
    if (found) {
      markSagaRead(found.id);
    }
    setLoaded(true);
  }, [sagaId]);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (!saga) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa] p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Sage nicht gefunden</h1>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 text-white px-5 py-2.5 text-sm font-bold hover:bg-emerald-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Bibliothek
        </Link>
      </div>
    );
  }

  return (
    <SpeechReader
      initialSaga={saga}
      customSagas={customSagas}
      onBackToHub={() => router.push("/")}
      onStartWriting={(active) => {
        markSagaRead(active.id);
        router.push(`/sage/${active.id}/schreiben`);
      }}
    />
  );
}
