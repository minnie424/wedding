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

  // ✅ preview modal state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function refresh() {
    // 1) Load photos + vote counts (includes 0 votes)
    const { data, error } = await supabase
      .from("photos_with_votes")
      .select("id, storage_path, uploader_name, vote_count")
      .order("id", { ascending: true })
      .limit(200);

    if (error) {
      alert(error.message);
      return;
    }

    // Build public URLs for display
    const photosForUi =
      (data ?? []).map((p: any) => ({
        id: p.id,
        vote_count: p.vote_count ?? 0,
        uploader_name: p.name ?? "", // keep your UI field name
        public_url: supabase.storage
          .from("wedding-photos")
          .getPublicUrl(p.storage_path).data.publicUrl,
      })) ?? [];

    setPhotos(photosForUi as Photo[]);

    // 2) Load my votes (for highlighting / unselect)
    const { data: v, error: vErr } = await supabase
      .from("votes")
      .select("photo_id")
      .eq("voter_key", voterKey);

    if (vErr) {
      alert(vErr.message);
      return;
    }

    setMyVotes(new Set((v ?? []).map((x: any) => x.photo_id)));
  }

  useEffect(() => {
    refresh();

    // Optional: realtime refresh when new photos/votes arrive
    const channel = supabase
      .channel("realtime-photos-votes")
      .on("postgres_changes", { event: "*", schema: "public", table: "photos" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Block common save/print shortcuts only when preview is open; Esc closes
  useEffect(() => {
    if (!previewUrl) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && (e.key.toLowerCase() === "s" || e.key.toLowerCase() === "p")) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (e.key === "Escape") setPreviewUrl(null);
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true } as any);
  }, [previewUrl]);

  async function toggleVote(photoId: string) {
    const isSelected = myVotes.has(photoId);

    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        photo_id: photoId,
        voter_key: voterKey,
        action: isSelected ? "remove" : "add",
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(json?.error || "Vote failed");
      return;
    }

    await refresh();
  }

  const myVoteCount = myVotes.size;
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>📸 Wedding Photo Game</h1>
      <p>
        Pick your <b>Top 3</b> favourites. Your votes: <b>{myVoteCount}/3</b>
      </p>

      <section>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {photos.map((p) => {
            const voted = myVotes.has(p.id);
            return (
              <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
                {/* ✅ Click image to preview */}
                <div
                  onClick={() => setPreviewUrl(p.public_url)}
                  style={{ cursor: "zoom-in", background: "#fff" }}
                >
                  <img
                    src={p.public_url}
                    alt=""
                    className="noSave"
                    style={{
                      width: "100%",
                      height: 180,
                      objectFit: "contain",
                      userSelect: "none",
                    }}
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </div>

                <div style={{ padding: 10, display: "grid", gap: 6 }}>
                  <button
                    onClick={() => toggleVote(p.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #ccc",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {voted ? "✅ Selected" : "➕ Select"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ✅ Preview Modal */}
      {previewUrl && (
        <div
          onClick={() => setPreviewUrl(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "92vw",
              maxHeight: "92vh",
            }}
          >
            <button
              onClick={() => setPreviewUrl(null)}
              style={{
                position: "absolute",
                top: -12,
                right: -12,
                width: 36,
                height: 36,
                borderRadius: 999,
                border: "none",
                background: "#fff",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: "36px",
              }}
              aria-label="Close preview"
            >
              ✕
            </button>

            <img
              src={previewUrl}
              alt="Preview"
              style={{
                maxWidth: "92vw",
                maxHeight: "92vh",
                borderRadius: 14,
                display: "block",
                userSelect: "none",
              }}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />

            {/* Optional watermark overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "flex-end",
                padding: 10,
              }}
            >
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
