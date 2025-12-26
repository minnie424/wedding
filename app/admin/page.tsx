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
  const [votingOpen, setVotingOpen] = useState<boolean | null>(null);
  const [savingVoting, setSavingVoting] = useState(false);

  const styles = {
  outlineButton: {
    padding: "10px 18px",
    borderRadius: 10,
    border: "2px solid #333",
    backgroundColor: "#fff",
    color: "#000",
    fontSize: 16,
    fontWeight: 500,
    cursor: "pointer",
  },
};

  async function refresh() {
    // 1) Load photos + vote counts (includes 0 votes)
    const { data, error } = await supabase
      .from("photos_with_votes")
      .select("id, storage_path, uploader_name, vote_count")
      .order("vote_count", { ascending: false })
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
        uploader_name: p.uploader_name ?? "", // keep your UI field name
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
  
  async function loadVotingStatus() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("voting_open")
    .eq("id", 1)
    .single();

  if (!error && data) {
    setVotingOpen(!!data.voting_open);
  }
}
async function toggleVoting() {
  setSavingVoting(true);

  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      voting_open: !votingOpen,
    }),
  });

  const json = await res.json().catch(() => ({}));
  setSavingVoting(false);

  if (!res.ok) {
    alert(JSON.stringify(json) || "Failed to update voting status");
    return;
  }

  setVotingOpen(!votingOpen);
}


    useEffect(() => {
      refresh();
      loadVotingStatus();

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

      setFiles([]);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

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
    // If they hit the 3-vote limit, show message and keep current selections
    alert(json?.error || "Vote failed");
    return;
  }

  await refresh();
}

  const myVoteCount = myVotes.size;

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>📸 Wedding Photo Game</h1>
<section style={{ marginBottom: 24, padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
  <h2>Admin Control</h2>

  <div style={{ marginBottom: 8 }}>
    Voting status:{" "}
    <b>
      {votingOpen === null ? "Loading…" : votingOpen ? "OPEN" : "CLOSED"}
    </b>
  </div>

  <button
    onClick={toggleVoting}
    disabled={savingVoting || votingOpen === null}
    style={styles.outlineButton}
  >
    {savingVoting
      ? "Saving…"
      : votingOpen
      ? "Stop voting"
      : "Start voting"}
  </button>

  <div style={{
    display: "flex",
    gap: 16,
    marginTop: 16,
    flexWrap: "wrap",
  }}><a
  href="https://wedding-minnie-jason.vercel.app/slideshow"
  target="_blank"
  rel="noopener noreferrer"
  style={styles.outlineButton}
>
  Slideshow
</a>
<a
  href="https://wedding-minnie-jason.vercel.app/top3"
  target="_blank"
  rel="noopener noreferrer"
  style={styles.outlineButton}
>
  Top 3 Photos
</a></div>

</section>

      <section>
        <h2>Live Gallery</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {photos.map((p) => {
            const voted = myVotes.has(p.id);
            return (
              <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
                <img src={p.public_url} alt="" style={{ width: "100%", height: 180, objectFit: "cover" }} />
                <div style={{ padding: 10, display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {p.uploader_name ? `By ${p.uploader_name}` : " "}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {p.vote_count ? `Votes ${p.vote_count}` : " "}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
