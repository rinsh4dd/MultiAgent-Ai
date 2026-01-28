import { useRef, useState, useEffect } from "react";
import { Play, Pause, Mic } from "lucide-react";

export default function VoiceMessage({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const update = () => {
      setCurrent(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    audio.addEventListener("timeupdate", update);
    audio.addEventListener("loadedmetadata", update);
    audio.addEventListener("ended", () => setPlaying(false));

    return () => {
      audio.removeEventListener("timeupdate", update);
      audio.removeEventListener("loadedmetadata", update);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    playing ? audio.pause() : audio.play();
    setPlaying(!playing);
  };

  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 rounded-2xl w-full max-w-[280px] shadow-sm">
      
      {/* Play Button - Minimal Circle */}
      <button
        onClick={togglePlay}
        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
      >
        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} className="ml-0.5" fill="currentColor" />}
      </button>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-end mb-2">
           <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <Mic size={10} /> Voice Note
           </span>
           <span className="text-[11px] font-mono text-neutral-500">
            {format(current)} / {format(duration)}
          </span>
        </div>

        {/* Progress Bar - Sleek & Thin */}
        <div className="relative h-1 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-neutral-900 dark:bg-white transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}

function format(sec = 0) {
  if (isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}