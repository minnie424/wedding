"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Photo = {
  id: string;
  storage_path: string;
};

export default function SlideshowPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  // Fetch photos
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("photos")
        .select("id, storage_path")
        .order("id", { ascending: true });

      setPhotos((data ?? []) as Photo[]);
      setIndex(0);
      setFinished(false);
      setStarted(false);
    }
    load();
  }, []);

  // Auto-advance every 3 seconds (after Start), stop at end
  useEffect(() => {
    if (!started) return;
    if (photos.length === 0) return;
    if (finished) return;

    const timer = setInterval(() => {
      setIndex((i) => {
        const next = i + 1;
        if (next >= photos.length) {
          setFinished(true); // stop at end
          return i; // keep showing last photo
        }
        return next;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [started, photos.length, finished]);

  const currentUrl = useMemo(() => {
    if (photos.length === 0) return "";
    const photo = photos[index];
    return supabase.storage.from("wedding-photos").getPublicUrl(photo.storage_path)
      .data.publicUrl;
  }, [photos, index]);

  // ---------- UI states ----------
  if (photos.length === 0) {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.centerText}>Waiting for photos…</div>
      </div>
    );
  }

  if (!started) {
    return (
      <div style={styles.fullscreen}>
        <div style={{ ...styles.centerText, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📸 Slideshow</div>
          <div style={{ fontSize: 18, opacity: 0.85, marginBottom: 22 }}>
            {photos.length} photos shared, vote for your favourite ones (max. 3)
          </div>
          <img
           src="QR code.png"
           alt="Slideshow QR Code"
           width={160}
           height={160}
          />
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
          <div style={{ fontSize: 32, marginBottom: 10 }}>🎉 Please vote (maximum 3)</div>

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

  // ---------- Slideshow ----------
  return (
    <div style={styles.fullscreen}>
      <img
        key={photos[index].id}
        src={currentUrl}
        alt=""
        style={styles.imageContain}  // use contain (no crop)
      />
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
  },
  // ✅ Centered + fits screen without distortion
  // If you want full-bleed (cropping edges), change objectFit to "cover"
  imageContain: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    objectPosition: "center",
  },
  centerText: {
    color: "white",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  button: {
    fontSize: 18,
    padding: "12px 22px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
  },
};
