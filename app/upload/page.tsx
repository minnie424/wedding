"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getVoterKey } from "@/lib/voterKey";
import { toJpegIfHeic } from "@/lib/heic";

type Photo = {
  id: string;
  created_at: string;
  public_url: string;
  uploader_name: string | null;
  vote_count: number;
};

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const voterKey = useMemo(() => getVoterKey(), []);


  async function handleUpload() {
    if (!name.trim()) {
  alert("Please enter your name before uploading.");
  return;
  }
    if (!files.length) return;
    setBusy(true);
    try {
      for (const f of files) {
        const file = await toJpegIfHeic(f);

        // lightweight client resize/compress is a plus; skipping for simplicity
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${Date.now()}_${crypto.randomUUID()}.${ext}`;

        const { error: upErr } = await supabase
          .storage
          .from("wedding-photos")
          .upload(path, file, { contentType: file.type, upsert: false });

        if (upErr) throw upErr;

        const { data: pub } = supabase
          .storage
          .from("wedding-photos")
          .getPublicUrl(path);

        const public_url = pub.publicUrl;

        const { error: dbErr } = await supabase
          .from("photos")
          .insert({
            storage_path: path,
            public_url,
            uploader_name: name || null,
          });

        if (dbErr) throw dbErr;
      }

      
    } finally {
      alert("Successfully uploaded.");
      setBusy(false);
    }
  }


  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>📸 Wedding Photo Game</h1>

      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h2>Upload Photos for Minnie and Jason</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <input
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name*"
          />
          <input
            type="file"
            accept="image/*,.heic"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
          <button disabled={busy || files.length === 0} onClick={handleUpload}>
            {busy ? "Uploading..." : `Upload ${files.length ? `(${files.length})` : ""}`}
          </button>
        </div>
      </section>
    </main>
  );
}
