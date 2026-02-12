"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { reverse } from "dns";

type TopPhoto = {
  id: string;
  storage_path: string;
  uploader_name: string;
  vote_count: number;
};

export default function Top3Page() {
  const [top, setTop] = useState<TopPhoto[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  async function loadTop3() {
  setLoading(true);

  const { data, error } = await supabase
    .from("top3_winners")
    .select("id, storage_path, uploader_name, vote_count")
    .order("vote_count", { ascending: false })
    .order("id", { ascending: true });

  if (error) {
    alert(error.message);
    setLoading(false);
    return;
  }
  // Reverse: #3 → #2 → #1 (if you still want reveal from 3rd to 1st)
  const reversed = [...data].reverse();

  setTop(reversed);
  setIndex(0);
  setLoading(false);
}


  useEffect(() => {
    loadTop3();
  }, []);

  const current = top[index];

  const currentUrl = useMemo(() => {
    if (!current) return "";
    return supabase.storage
      .from("wedding-photos")
      .getPublicUrl(current.storage_path).data.publicUrl;
  }, [current]);

  function next() {
  if (top.length === 0) return;

  setIndex((i) => {
    const isLast = i >= top.length - 1;

    if (isLast) {
      setFinished(true);
      return i; // keep index (so it doesn't jump)
    }

    return i + 1;
  });
}

  if (loading) {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.text}>Loading Top 3…</div>
      </div>
    );
  }

  if (top.length === 0) {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.text}>
          No votes yet.
          <div style={{ marginTop: 16 }}>
            <button style={styles.button} onClick={loadTop3}>
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- UI states ----------
  if (!started) {
    return (
      <div style={styles.fullscreen}>
        <div style={{ ...styles.centerText, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>Reveal Favourite Photos</div>

          <button
            onClick={() => setStarted(true)}
            style={styles.button}
          >
            Start
          </button>

          <div style={{ marginTop: 18, fontSize: 14, opacity: 0.7 }}>
            Tip: press <b>F11</b> for fullscreen
          </div>
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div style={styles.fullscreen}>
        <div style={{ ...styles.centerText, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🎉 Thank You
            </div>

          <button
            onClick={() => {
              setIndex(0);
              setFinished(false);
              setStarted(true);
            }}
            style={styles.button}
          >
            Replay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.fullscreen} onClick={next} role="button" tabIndex={0}>
      <img src={currentUrl} alt="" style={styles.imageContain} />

      {/* overlay */}
      <div style={styles.overlay}>
        <div style={styles.nameLine}>
          # {top.length-index}
          <span style={styles.voteCount}>   ({current.vote_count} votes)</span>
        </div>
        <div style={styles.nameLine}>
          {current.uploader_name} 
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fullscreen: {
    width: "100vw",
    height: "100vh",
    background: "black",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    cursor: "pointer",
  },
  imageContain: {
    width: "100%",
    height: "100%",
    objectFit: "contain", // change to "cover" if you prefer full-bleed crop
    objectPosition: "center",
  },
  centerText: {
    color: "white",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  overlay: {
    position: "absolute",
    left: 20,
    right: 20,
    top: 18,
    color: "white",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    textShadow: "0 2px 10px rgba(0,0,0,0.8)",
    pointerEvents: "none", // keep click-to-next easy
  },
  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.55)",
    marginBottom: 10,
    fontSize: 14,
    pointerEvents: "none",
  },
  nameLine: {
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1.15,
    marginBottom: 6,
  },
  voteCount: {
    fontSize: 18,
    fontWeight: 500,
    opacity: 0.9,
  },
  hint: {
    fontSize: 14,
    opacity: 0.8,
  },
  text: {
    color: "white",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    fontSize: 18,
    textAlign: "center",
    padding: 24,
  },
  button: {
    fontSize: 16,
    padding: "10px 16px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
  },
  smallButton: {
    position: "absolute",
    right: 18,
    bottom: 18,
    fontSize: 14,
    padding: "8px 12px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    pointerEvents: "auto", // allow clicking button
  },
};
