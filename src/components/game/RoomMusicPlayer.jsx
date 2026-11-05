// @ts-nocheck
import { useMemo } from "react";
import { youtubeEmbedSrc, extractYouTubeId } from "@/lib/game/roomMusic";

/** Reproduce música de YouTube de la sala (iframe oculto, loop). */
export default function RoomMusicPlayer({ url, enabled = true }) {
  const src = useMemo(() => {
    if (!enabled || !url) return null;
    return youtubeEmbedSrc(url, { muted: false });
  }, [url, enabled]);

  const id = extractYouTubeId(url || "");
  if (!src || !id) return null;

  return (
    <iframe
      key={id}
      title="room-music"
      className="pointer-events-none fixed bottom-0 right-0 h-px w-px opacity-0"
      src={src}
      allow="autoplay; encrypted-media"
      allowFullScreen={false}
      tabIndex={-1}
    />
  );
}
