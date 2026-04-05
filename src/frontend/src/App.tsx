import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  Menu,
  Mic,
  Minus,
  Music2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Square,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BeatBuilder } from "./components/BeatBuilder";
import { MenuPanel, loadProjects, saveProject } from "./components/MenuPanel";
import type { SavedProject } from "./components/MenuPanel";
import PaywallScreen from "./components/PaywallScreen";
import {
  CHANNEL_COLORS,
  CHANNEL_LABELS,
  DEFAULT_CHANNEL_MAP,
} from "./data/instruments";
import { useAudioEngine } from "./hooks/useAudioEngine";
import type { RecordedNote } from "./hooks/useAudioEngine";
import PaymentFailure from "./pages/PaymentFailure";
import PaymentSuccess from "./pages/PaymentSuccess";

const CHANNEL_COUNT = 10;
const CHANNEL_INDICES = Array.from({ length: CHANNEL_COUNT }, (_, i) => i);

function hasPaid(): boolean {
  return localStorage.getItem("musicmouth_paid") === "true";
}

// Top-level router: renders the right page based on the current URL path
export default function App() {
  const path = window.location.pathname;
  if (path === "/payment-success") return <PaymentSuccess />;
  if (path === "/payment-failure") return <PaymentFailure />;
  return <AppWithPaywall />;
}

// Handles the paywall gate before showing the main app
function AppWithPaywall() {
  const [paid, setPaid] = useState(hasPaid);

  useEffect(() => {
    const handler = () => setPaid(hasPaid());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  if (!paid) {
    return (
      <>
        <Toaster position="top-center" />
        <PaywallScreen />
      </>
    );
  }

  return <AppContent />;
}

function AppContent() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [levels, setLevels] = useState<number[]>(
    new Array(CHANNEL_COUNT).fill(0),
  );
  const [notes, setNotes] = useState<RecordedNote[]>([]);
  const [instrumentMap, setInstrumentMap] = useState<Record<number, string>>({
    ...DEFAULT_CHANNEL_MAP,
  });
  const [projectName, setProjectName] = useState("Untitled Beat");
  const [editingName, setEditingName] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [activeChannelForAssign, setActiveChannelForAssign] = useState<
    number | null
  >(null);
  const [showBeatBuilder, setShowBeatBuilder] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const stopPlaybackRef = useRef<(() => void) | null>(null);
  const recordingStartRef = useRef<number>(0);

  const onLevelsUpdate = useCallback((l: number[]) => setLevels(l), []);
  const onNoteTriggered = useCallback((note: RecordedNote) => {
    setNotes((prev) => [...prev, note]);
  }, []);

  const { startRecording, stopRecording, playbackNotes, exportToWav } =
    useAudioEngine({
      bpm,
      instrumentMap,
      onLevelsUpdate,
      onNoteTriggered,
    });

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#project=")) {
      try {
        const encoded = hash.replace("#project=", "");
        const data = JSON.parse(atob(encoded));
        setProjectName(data.name ?? "Shared Beat");
        setBpm(data.bpm ?? 120);
        setNotes(data.notes ?? []);
        setInstrumentMap(data.instrumentMap ?? DEFAULT_CHANNEL_MAP);
        setHasRecorded((data.notes ?? []).length > 0);
        toast.success("Shared project loaded!");
        window.location.hash = "";
      } catch {
        // ignore
      }
    }
  }, []);

  const handleRecord = async () => {
    if (isRecording) {
      stopRecording();
      setIsRecording(false);
      setHasRecorded(true);
      setLevels(new Array(CHANNEL_COUNT).fill(0));
      return;
    }
    try {
      await startRecording();
      setIsRecording(true);
      setHasRecorded(false);
      recordingStartRef.current = Date.now();
    } catch {
      toast.error(
        "Microphone access denied. Please allow mic in browser settings.",
      );
    }
  };

  const handleErase = () => {
    setNotes([]);
    setHasRecorded(false);
    setIsPlaying(false);
    stopPlaybackRef.current?.();
    toast.info("Recording erased. Ready to re-record.");
  };

  const handlePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopPlaybackRef.current?.();
      return;
    }
    if (notes.length === 0) {
      toast.info("Nothing to play yet. Record something first!");
      return;
    }
    setIsPlaying(true);
    const cleanup = playbackNotes(notes, bpm, isLooping, () => {
      if (!isLooping) setIsPlaying(false);
    });
    stopPlaybackRef.current = cleanup ?? null;
  };

  const handleSave = useCallback(() => {
    const project: SavedProject = {
      id: `project_${Date.now()}`,
      name: projectName,
      bpm,
      notes,
      instrumentMap,
      savedAt: Date.now(),
    };
    saveProject(project);
  }, [projectName, bpm, notes, instrumentMap]);

  const downloadJson = useCallback(() => {
    const data = { name: projectName, bpm, notes, instrumentMap };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Project JSON downloaded!");
  }, [projectName, bpm, notes, instrumentMap]);

  const handleDownload = useCallback(async () => {
    if (notes.length > 0) {
      toast.info("Generating WAV file\u2026");
      try {
        const blob = await exportToWav(notes, bpm, instrumentMap);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${projectName.replace(/\s+/g, "_")}.wav`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("WAV downloaded!");
      } catch {
        downloadJson();
      }
    } else {
      downloadJson();
    }
  }, [notes, bpm, instrumentMap, projectName, exportToWav, downloadJson]);

  const handleLoadProject = (p: SavedProject) => {
    setProjectName(p.name);
    setBpm(p.bpm);
    setNotes(p.notes);
    setInstrumentMap(p.instrumentMap);
    setHasRecorded(p.notes.length > 0);
  };

  const handleAssignInstrument = (channelId: number, instrument: string) => {
    setInstrumentMap((prev) => ({ ...prev, [channelId]: instrument }));
  };

  const savedProjects = loadProjects();

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ background: "oklch(0.08 0.01 240)" }}
    >
      {/* Full-page background wallpaper at low opacity */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          backgroundImage:
            "url('/assets/generated/music-mouth-wallpaper.dim_1200x800.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.1,
          pointerEvents: "none",
        }}
      />

      {/* All content sits above the background */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <Toaster position="top-center" />

        <header
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "oklch(0.22 0.015 240)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: "oklch(0.67 0.22 15)",
                boxShadow: "0 0 16px oklch(0.67 0.22 15 / 0.6)",
              }}
            >
              <Mic className="w-4 h-4 text-white" />
            </div>
            <h1
              className="font-display text-xl font-bold"
              style={{ color: "oklch(0.96 0.005 240)" }}
            >
              Music{" "}
              <span
                style={{
                  color: "oklch(0.67 0.22 15)",
                  textShadow: "0 0 20px oklch(0.67 0.22 15 / 0.8)",
                }}
              >
                Mouth
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                borderColor: "oklch(0.79 0.16 192 / 0.4)",
                color: "oklch(0.79 0.16 192)",
              }}
            >
              {savedProjects.length} saved
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(true)}
              data-ocid="nav.menu.button"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div className="px-4 py-2 flex items-center gap-2">
          {editingName ? (
            <input
              ref={nameInputRef}
              defaultValue={projectName}
              onBlur={(e) => {
                setProjectName(e.target.value || "Untitled Beat");
                setEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="bg-transparent border-b text-sm font-medium outline-none w-48"
              style={{
                borderColor: "oklch(0.79 0.16 192 / 0.6)",
                color: "oklch(0.96 0.005 240)",
              }}
              data-ocid="project.name.input"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="text-sm font-medium transition-colors"
              style={{ color: "oklch(0.72 0.015 240)" }}
              data-ocid="project.name.button"
            >
              \u270f\ufe0f {projectName}
            </button>
          )}
          <span className="text-xs" style={{ color: "oklch(0.55 0.01 240)" }}>
            \u00b7 {notes.length} notes
          </span>
        </div>

        <main className="flex-1 flex flex-col items-center px-4 pb-4 gap-4 overflow-auto">
          <div className="flex flex-col items-center gap-4 mt-2">
            {/* BPM */}
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setBpm((v) => Math.max(60, v - 1))}
                data-ocid="bpm.minus.button"
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span
                className="text-sm font-mono font-bold min-w-[4.5rem] text-center"
                style={{
                  color: "oklch(0.85 0.18 75)",
                  textShadow: "0 0 10px oklch(0.85 0.18 75 / 0.5)",
                }}
              >
                {bpm} BPM
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setBpm((v) => Math.min(200, v + 1))}
                data-ocid="bpm.plus.button"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>

            {/* Record Button */}
            <div className="relative flex items-center justify-center">
              {isRecording && (
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: 160,
                    height: 160,
                    background: "oklch(0.67 0.22 15 / 0.15)",
                    border: "2px solid oklch(0.67 0.22 15 / 0.4)",
                  }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{
                    duration: 1.2,
                    repeat: Number.POSITIVE_INFINITY,
                  }}
                />
              )}
              {isRecording && (
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: 200,
                    height: 200,
                    background: "oklch(0.67 0.22 15 / 0.06)",
                    border: "1px solid oklch(0.67 0.22 15 / 0.2)",
                  }}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{
                    duration: 1.2,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: 0.4,
                  }}
                />
              )}
              <motion.button
                type="button"
                onClick={handleRecord}
                whileTap={{ scale: 0.95 }}
                className="relative z-10 w-32 h-32 rounded-full flex flex-col items-center justify-center font-display font-bold text-white gap-1"
                style={{
                  background: isRecording
                    ? "oklch(0.67 0.22 15)"
                    : "oklch(0.5 0.18 15)",
                  boxShadow: isRecording
                    ? "0 0 40px oklch(0.67 0.22 15 / 0.8), 0 0 80px oklch(0.67 0.22 15 / 0.4)"
                    : "0 0 20px oklch(0.5 0.18 15 / 0.5)",
                  transition: "all 0.2s ease",
                }}
                data-ocid="record.primary_button"
              >
                {isRecording ? (
                  <>
                    <Square className="w-7 h-7 fill-white" />
                    <span className="text-xs font-bold tracking-wider">
                      STOP
                    </span>
                  </>
                ) : (
                  <>
                    <Mic className="w-7 h-7" />
                    <span className="text-xs font-bold tracking-wider">
                      RECORD
                    </span>
                  </>
                )}
              </motion.button>
            </div>

            {/* Playback */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <Button
                variant={isPlaying ? "default" : "outline"}
                size="sm"
                onClick={handlePlay}
                className="gap-2"
                style={
                  isPlaying
                    ? {
                        background: "oklch(0.79 0.16 192)",
                        color: "oklch(0.08 0.01 240)",
                      }
                    : {}
                }
                data-ocid="playback.play.button"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <Button
                variant={isLooping ? "default" : "outline"}
                size="sm"
                onClick={() => setIsLooping((v) => !v)}
                className="gap-2"
                style={
                  isLooping
                    ? { background: "oklch(0.72 0.2 300)", color: "white" }
                    : {}
                }
                data-ocid="playback.loop.toggle"
              >
                <RotateCcw className="w-4 h-4" />
                Loop
              </Button>
              <AnimatePresence>
                {hasRecorded && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Button
                      size="sm"
                      onClick={handleErase}
                      className="gap-2 font-bold"
                      style={{
                        background: "oklch(0.5 0.22 15)",
                        color: "white",
                        boxShadow: "0 0 12px oklch(0.67 0.22 15 / 0.4)",
                      }}
                      data-ocid="record.erase.button"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Erase &amp; Re-Record
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Create Instrumental Button */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                size="sm"
                className="gap-2 font-bold"
                onClick={() => setShowBeatBuilder(true)}
                style={{
                  background: "oklch(0.85 0.18 75 / 0.15)",
                  border: "1px solid oklch(0.85 0.18 75 / 0.5)",
                  color: "oklch(0.85 0.18 75)",
                  boxShadow: "0 0 16px oklch(0.85 0.18 75 / 0.3)",
                }}
                data-ocid="instrumental.create.button"
              >
                <Music2 className="w-4 h-4" />
                Create Instrumental
              </Button>
            </motion.div>
          </div>

          {/* Channels */}
          <div className="w-full max-w-2xl space-y-1.5">
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "oklch(0.55 0.01 240)" }}
            >
              Sound Channels
            </p>
            {CHANNEL_INDICES.map((i) => (
              <SoundChannel
                key={`channel-${CHANNEL_LABELS[i]}`}
                index={i}
                label={CHANNEL_LABELS[i]}
                instrument={instrumentMap[i]}
                level={levels[i] ?? 0}
                color={CHANNEL_COLORS[i]}
                onSwapInstrument={() => {
                  setActiveChannelForAssign(i);
                  setMenuOpen(true);
                }}
              />
            ))}
          </div>

          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="w-full max-w-2xl"
              >
                <WaveformVisualizer levels={levels} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer
          className="text-center py-3 border-t"
          style={{ borderColor: "oklch(0.18 0.012 240)" }}
        >
          <p className="text-xs" style={{ color: "oklch(0.55 0.01 240)" }}>
            \u00a9 {new Date().getFullYear()}. Built with \u2764\ufe0f using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "oklch(0.79 0.16 192)" }}
            >
              caffeine.ai
            </a>
          </p>
        </footer>

        <MenuPanel
          open={menuOpen}
          onClose={() => {
            setMenuOpen(false);
            setActiveChannelForAssign(null);
          }}
          projectName={projectName}
          bpm={bpm}
          onBpmChange={(val) => setBpm(val)}
          notes={notes}
          instrumentMap={instrumentMap}
          onSave={handleSave}
          onDownload={handleDownload}
          onLoadProject={handleLoadProject}
          onAssignInstrument={handleAssignInstrument}
          activeChannelForAssign={activeChannelForAssign}
          onClearActiveChannel={() => setActiveChannelForAssign(null)}
          onDownloadJson={downloadJson}
        />

        {showBeatBuilder && (
          <BeatBuilder
            bpm={bpm}
            onBpmChange={(val) => setBpm(val)}
            onClose={() => setShowBeatBuilder(false)}
          />
        )}
      </div>
    </div>
  );
}

interface SoundChannelProps {
  index: number;
  label: string;
  instrument: string;
  level: number;
  color: string;
  onSwapInstrument: () => void;
}

function SoundChannel({
  index,
  label,
  instrument,
  level,
  color,
  onSwapInstrument,
}: SoundChannelProps) {
  const pct = Math.min(100, Math.round(level * 100));
  const active = pct > 5;

  return (
    <motion.div
      className="flex items-center gap-2 p-2 rounded-lg"
      style={{
        background: active
          ? color.replace(")", " / 0.08)")
          : "oklch(0.13 0.012 240)",
        border: `1px solid ${active ? color.replace(")", " / 0.4)") : "oklch(0.22 0.015 240)"}`,
        transition: "border-color 0.1s, background 0.1s",
      }}
      data-ocid={`channel.item.${index + 1}`}
    >
      <span
        className="text-xs font-mono w-4 text-right flex-shrink-0"
        style={{ color: "oklch(0.55 0.01 240)" }}
      >
        {index + 1}
      </span>
      <span
        className="text-xs font-medium w-24 flex-shrink-0 truncate"
        style={{ color: active ? color : "oklch(0.72 0.015 240)" }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-4 rounded-sm overflow-hidden"
        style={{ background: "oklch(0.18 0.012 240)" }}
      >
        <motion.div
          className="h-full rounded-sm"
          style={{
            background: color,
            boxShadow: active
              ? `0 0 8px ${color.replace(")", " / 0.6)")}`
              : "none",
          }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.05, ease: "linear" }}
        />
      </div>
      <button
        type="button"
        onClick={onSwapInstrument}
        className="text-xs px-2 py-0.5 rounded border transition-colors flex-shrink-0 max-w-[90px] truncate"
        style={{
          borderColor: active
            ? color.replace(")", " / 0.5)")
            : "oklch(0.28 0.02 240)",
          color: active ? color : "oklch(0.72 0.015 240)",
          background: active ? color.replace(")", " / 0.12)") : "transparent",
        }}
        title={`Click to swap: ${instrument}`}
        data-ocid={`channel.swap.button.${index + 1}`}
      >
        {instrument}
      </button>
    </motion.div>
  );
}

function WaveformVisualizer({ levels }: { levels: number[] }) {
  return (
    <div
      className="relative w-full h-16 rounded-lg overflow-hidden flex items-end gap-0.5 px-2 py-2"
      style={{
        background: "oklch(0.13 0.012 240)",
        border: "1px solid oklch(0.22 0.015 240)",
      }}
    >
      {CHANNEL_LABELS.map((label, i) => (
        <motion.div
          key={`wave-${label}`}
          className="flex-1 rounded-t-sm min-w-0"
          style={{ background: CHANNEL_COLORS[i] }}
          animate={{ height: `${Math.max(4, (levels[i] ?? 0) * 100)}%` }}
          transition={{ duration: 0.05 }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className="text-xs animate-pulse"
          style={{ color: "oklch(0.67 0.22 15)" }}
        >
          \u25cf REC
        </span>
      </div>
    </div>
  );
}
