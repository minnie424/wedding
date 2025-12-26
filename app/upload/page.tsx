"use client";

import { useMemo, useState, useRef } from "react";
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

  // (not used on upload page, but leaving as-is in case you need it elsewhere)
  const voterKey = useMemo(() => getVoterKey(), []);

  // ✅ Single input ref + remount key (iOS-friendly reset)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

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
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${Date.now()}_${crypto.randomUUID()}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("wedding-photos")
          .upload(path, file, { contentType: file.type, upsert: false });

        if (upErr) throw upErr;

        const { data: pub } = supabase.storage
          .from("wedding-photos")
          .getPublicUrl(path);

        const public_url = pub.publicUrl;

        const { error: dbErr } = await supabase.from("photos").insert({
          storage_path: path,
          public_url,
          uploader_name: name || null,
        });

        if (dbErr) throw dbErr;
      }

      // ✅ Clear selection AFTER successful upload
      setFiles([]);
      setFileInputKey((k) => k + 1); // remount input => clears filename on iOS
      if (fileInputRef.current) fileInputRef.current.value = "";

      alert("Successfully uploaded 🎉");
    } catch (e: any) {
      alert(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Minnie & Jason&apos;s Wedding Party
      </h1>

      <section
        style={{
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 20,
          padding: 24,
          maxWidth: 420,
        }}
      >
        <p style={{ opacity: 0.8, marginBottom: 18 }}>
          Share funny photos of <b>Minnie & Jason</b> 🤍
        </p>

        <div style={{ display: "grid", gap: 12 }}>
          <input
            type="text"
            autoComplete="name"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck={false}
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
            }}
          />

          {/* ✅ Label triggers hidden input */}
          <label
            style={{
              display: "block",
              padding: "14px",
              borderRadius: 12,
              border: "1px dashed rgba(255,255,255,0.25)",
              textAlign: "center",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            📷 Select photos from your phone
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
              {files.length ? `${files.length} photo(s) selected` : "No photos selected"}
            </div>

            <input
              key={fileInputKey}
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic"
              multiple
              style={{ display: "none" }}     // ✅ hide native filename UI
              disabled={busy}
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>

          <button
            disabled={busy || !files.length || !name.trim()}
            onClick={handleUpload}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: 14,
              border: "none",
              background: busy ? "#444" : "linear-gradient(135deg, #ffffff, #f3f3f3)",
              color: "#000",
              fontSize: 17,
              fontWeight: 700,
              cursor: busy || !files.length || !name.trim() ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Uploading..." : `Upload${files.length ? ` (${files.length})` : ""}`}
          </button>
        </div>
      </section>
    </main>
  );
}
