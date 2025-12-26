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

  const cardStyle = {
  maxWidth: 420,
  margin: "0 auto",
  padding: 24,
  borderRadius: 20,
  background: "linear-gradient(180deg, #111, #1a1a1a)",
  border: "1px solid rgba(255,255,255,0.15)",
  boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
};

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
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
  📸    Wedding Photo Game
      </h1>

      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <p style={{ opacity: 0.8, marginBottom: 24 }}>
          Share your memories with <b>Minnie & Jason</b> 🤍
        </p>
        <div style={{ display: "grid", gap: 12 }}>
          <input
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name*"
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "#000",
              color: "#fff",
              fontSize: 16,
              marginBottom: 14,
            }}
          />
          <label
            style={{
              display: "block",
              padding: "14px",
              borderRadius: 12,
              border: "1px dashed rgba(255,255,255,0.25)",
              textAlign: "center",
              marginBottom: 8,
              cursor: "pointer",
            }}
          >
            📷 Select photos from your phone
          <input
            type="file"
            accept="image/*,.heic"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
          </label>
         
          <button disabled={busy || files.length === 0} onClick={handleUpload}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: 14,
              border: "none",
              background: busy
                ? "#444"
                : "linear-gradient(135deg, #ffffff, #f3f3f3)",
              color: "#000",
              fontSize: 17,
              fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
            }}>
            {busy ? "Uploading..." : `Upload ${files.length ? `(${files.length})` : ""}`}
          </button>
        </div>
      </section>
    </main>
  );
}
