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

type TopPhoto = {
  id: string;
  public_url: string;
  storage_path: string;
  uploader_name: string;
  vote_count: number;
};

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [top, setTop] = useState<TopPhoto[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const voterKey = useMemo(() => getVoterKey(), []);
  const [uploadingOpen, setUploadingOpen] = useState<boolean | null>(null);
  const [votingOpen, setVotingOpen] = useState<boolean | null>(null);
  const [savingUploading, setSavingUploading] = useState(false);
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

async function loadTop3() {
  const { data, error } = await supabase
    .from("top3_winners")
    .select("id, storage_path, uploader_name, vote_count")
    .order("vote_count", { ascending: false })
    .order("id", { ascending: true })
    .limit(3);

  if (error) {
    console.error("Failed to load top 3", error);
    return;
  }

  const topForUi =
    (data ?? []).map((p: any) => ({
      id: p.id,
      storage_path: p.storage_path,
      uploader_name: p.uploader_name ?? "",
      vote_count: p.vote_count ?? 0,
      public_url: supabase.storage
        .from("wedding-photos")
        .getPublicUrl(p.storage_path).data.publicUrl,
    })) ?? [];

  setTop(topForUi);
}


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
  
  async function loadUploadingStatus() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("uploading_open")
    .eq("id", 1)
    .single();

  if (!error && data) {
    setUploadingOpen(!!data.uploading_open);
  }
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
async function toggleUploading() {
  setSavingUploading(true);

  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uploading_open: !uploadingOpen,
    }),
  });

  const json = await res.json().catch(() => ({}));
  setSavingUploading(false);

  if (!res.ok) {
    alert(JSON.stringify(json) || "Failed to update uploading status");
    return;
  }

  setUploadingOpen(!uploadingOpen);
}

async function toggleVoting() {
  setSavingVoting(true);

  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uploading_open: !uploadingOpen,
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
      loadTop3();
      loadUploadingStatus();
      loadVotingStatus();

      const channel = supabase
        .channel("realtime-gallery")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "photos" },
          () => {
            refresh(); // new photos affect gallery only
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "votes" },
          () => {
            refresh();   // votes affect gallery
            loadTop3();  // votes affect top 3
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Minnie & Jason&apos;s Wedding Party
      </h1>
<section style={{ marginBottom: 24, padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
  <h2>Admin Control</h2>
  <div style={{ marginBottom: 8 }}>
    Uploading status:{" "}
    <b>
      {uploadingOpen === null ? "Loading…" : uploadingOpen ? "OPEN" : "CLOSED"}{" "}
    </b>
    <button
    onClick={toggleUploading}
    disabled={savingUploading || uploadingOpen === null}
    style={styles.outlineButton}
  >
    {savingUploading
      ? "Saving…"
      : uploadingOpen
      ? "Stop uploading"
      : "Start uploading"}
  </button>
    </div>
    <div style={{ marginBottom: 8 }}>
      Voting status:{" "}
    <b>
      {votingOpen === null ? "Loading…" : votingOpen ? "OPEN" : "CLOSED"}{" "}
    </b>
  
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
  </button></div>

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
      <section style={{ marginBottom: 24, padding: 12}}>
        <h2>Top 3 Photos</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {top.map((p) => {
            const voted = myVotes.has(p.id);
            return (
              <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
                <img src={p.public_url} alt="" style={{ width: "100%", height: 180, objectFit: "cover" }} />
                <div style={{ padding: 10, display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 14 }}>
                    {p.uploader_name ? `By ${p.uploader_name}` : " "}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    {p.vote_count ? `Votes ${p.vote_count}` : " "}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ marginBottom: 24, padding: 12}}>
        <h2>Live Gallery</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {photos.map((p) => {
            const voted = myVotes.has(p.id);
            return (
              <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
                <img src={p.public_url} alt="" style={{ width: "100%", height: 180, objectFit: "cover" }} />
                <div style={{ padding: 10, display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 14 }}>
                    {p.uploader_name ? `By ${p.uploader_name}` : " "}
                  </div>
                  <div style={{ fontSize: 14 }}>
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
