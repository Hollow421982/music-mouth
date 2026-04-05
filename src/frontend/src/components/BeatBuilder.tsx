import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Minus,
  Music,
  Play,
  Plus,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  INSTRUMENTS,
  INSTRUMENT_CATEGORIES,
  type Instrument,
} from "../data/instruments";

export interface BeatBuilderProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  onClose: () => void;
}

interface Track {
  id: string;
  instrumentName: string;
  steps: boolean[];
}

const STEP_COUNT = 16;
const MAX_TRACKS = 16;
const BARS_FOR_EXPORT = 4;
const STEP_LABELS = Array.from(
  { length: STEP_COUNT },
  (_, i) => `step-label-${i + 1}`,
);

const NEON_COLORS = [
  "oklch(0.79 0.16 192)",
  "oklch(0.72 0.2 300)",
  "oklch(0.85 0.18 75)",
  "oklch(0.67 0.22 15)",
  "oklch(0.82 0.18 165)",
  "oklch(0.75 0.2 250)",
  "oklch(0.8 0.18 40)",
  "oklch(0.77 0.2 130)",
  "oklch(0.78 0.22 340)",
  "oklch(0.88 0.14 200)",
];

const DEFAULT_INSTRUMENTS = [
  "808 Kick",
  "Snare",
  "Hi-Hat",
  "Open Hi-Hat",
  "Clap",
  "Bass Synth",
  "Piano",
  "Pad Synth",
];

function createTrack(instrumentName: string): Track {
  return {
    id: `track_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    instrumentName,
    steps: new Array(STEP_COUNT).fill(false),
  };
}

function synthesizeStep(
  ctx: BaseAudioContext,
  instrument: Instrument,
  startTime: number,
  destination: AudioNode,
) {
  const gain = ctx.createGain();
  gain.connect(destination);
  const vol = 0.35;
  gain.gain.setValueAtTime(vol, startTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    startTime + (instrument.decay ?? 0.3),
  );

  const freq = instrument.baseFreq ?? 440;
  const waveform = instrument.waveform ?? "sine";
  const decay = instrument.decay ?? 0.3;

  // Noise-based instruments (hi-hats, cymbals, claps, shakers)
  const noiseInstruments = [
    "Hi-Hat",
    "Open Hi-Hat",
    "Cymbal",
    "Crash Cymbal",
    "Ride Cymbal",
    "Clap",
    "Shaker",
    "909 Hi-Hat",
    "Maracas",
    "Cabasa",
    "Tambourine",
  ];

  if (noiseInstruments.includes(instrument.name)) {
    const bufLen = Math.ceil(ctx.sampleRate * decay);
    const buf = ctx.createBuffer(1, Math.max(bufLen, 1), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = freq;
    filter.connect(gain);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(filter);
    src.start(startTime);
    return;
  }

  // Kick/bass drum — pitch envelope
  if (
    instrument.name.toLowerCase().includes("kick") ||
    instrument.name.toLowerCase().includes("bass drum") ||
    instrument.name.toLowerCase().includes("808")
  ) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * 2.5, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.06);
    osc.connect(gain);
    osc.start(startTime);
    osc.stop(startTime + decay);
    return;
  }

  // Default oscillator
  const osc = ctx.createOscillator();
  osc.type = waveform;
  osc.frequency.setValueAtTime(freq, startTime);
  osc.connect(gain);
  osc.start(startTime);
  osc.stop(startTime + decay);
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const byteLength = 44 + length * numChannels * 2;
  const arrayBuffer = new ArrayBuffer(byteLength);
  const view = new DataView(arrayBuffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, byteLength - 8, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, length * numChannels * 2, true);
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = buffer.getChannelData(ch)[i];
      const s = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function InstrumentPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [open, setOpen] = useState(false);

  const filtered = INSTRUMENTS.filter((i) => {
    const matchCat = category === "All" || i.category === category;
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs px-2 py-1 rounded border transition-colors max-w-[130px] truncate text-left w-full"
        style={{
          borderColor: "oklch(0.35 0.03 240)",
          color: "oklch(0.85 0.005 240)",
          background: "oklch(0.15 0.015 240)",
        }}
        data-ocid="beatbuilder.instrument.button"
      >
        {value}
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 rounded-lg shadow-2xl border overflow-hidden"
          style={{
            background: "oklch(0.12 0.015 240)",
            borderColor: "oklch(0.28 0.02 240)",
            width: 260,
          }}
        >
          <div className="p-2 space-y-2">
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs"
              style={{ background: "oklch(0.18 0.012 240)" }}
              data-ocid="beatbuilder.instrument.search_input"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                className="h-7 text-xs"
                style={{ background: "oklch(0.18 0.012 240)" }}
                data-ocid="beatbuilder.instrument.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {INSTRUMENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="h-48">
            <div className="px-2 pb-2 grid grid-cols-2 gap-1">
              {filtered.map((instr) => (
                <button
                  type="button"
                  key={`${instr.name}-${instr.category}`}
                  className="text-left text-xs px-2 py-1 rounded transition-colors truncate"
                  style={{
                    background:
                      instr.name === value
                        ? "oklch(0.79 0.16 192 / 0.2)"
                        : "transparent",
                    color:
                      instr.name === value
                        ? "oklch(0.79 0.16 192)"
                        : "oklch(0.72 0.015 240)",
                    border:
                      instr.name === value
                        ? "1px solid oklch(0.79 0.16 192 / 0.4)"
                        : "1px solid transparent",
                  }}
                  onClick={() => {
                    onChange(instr.name);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {instr.name}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

export function BeatBuilder({ bpm, onBpmChange, onClose }: BeatBuilderProps) {
  const [tracks, setTracks] = useState<Track[]>(() =>
    DEFAULT_INSTRUMENTS.map((name) => createTrack(name)),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isExporting, setIsExporting] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const schedulerTimerRef = useRef<number | null>(null);
  const nextStepTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const isPlayingRef = useRef(false);
  const tracksRef = useRef(tracks);
  const bpmRef = useRef(bpm);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const stepDuration = useCallback(() => 60 / bpmRef.current / 4, []);

  const scheduleStep = useCallback((stepIndex: number, time: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    for (const track of tracksRef.current) {
      if (!track.steps[stepIndex]) continue;
      const instrument = INSTRUMENTS.find(
        (i) => i.name === track.instrumentName,
      );
      if (!instrument) continue;
      synthesizeStep(ctx, instrument, time, ctx.destination);
    }
  }, []);

  const scheduler = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const scheduleAheadTime = 0.1;
    while (nextStepTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      scheduleStep(currentStepRef.current, nextStepTimeRef.current);
      setCurrentStep(currentStepRef.current);
      nextStepTimeRef.current += stepDuration();
      currentStepRef.current = (currentStepRef.current + 1) % STEP_COUNT;
    }
    if (isPlayingRef.current) {
      schedulerTimerRef.current = window.setTimeout(scheduler, 25);
    }
  }, [scheduleStep, stepDuration]);

  const startPlayback = useCallback(async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") await ctx.resume();
    currentStepRef.current = 0;
    nextStepTimeRef.current = ctx.currentTime + 0.05;
    isPlayingRef.current = true;
    setIsPlaying(true);
    scheduler();
  }, [scheduler]);

  const stopPlayback = useCallback(() => {
    isPlayingRef.current = false;
    if (schedulerTimerRef.current !== null) {
      window.clearTimeout(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }
    setIsPlaying(false);
    setCurrentStep(-1);
  }, []);

  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (schedulerTimerRef.current !== null) {
        window.clearTimeout(schedulerTimerRef.current);
      }
    };
  }, []);

  const exportWav = useCallback(async () => {
    setIsExporting(true);
    try {
      const sampleRate = 44100;
      const totalSteps = STEP_COUNT * BARS_FOR_EXPORT;
      const sd = 60 / bpmRef.current / 4;
      const totalDuration = totalSteps * sd + 1;
      const offlineCtx = new OfflineAudioContext(
        2,
        Math.ceil(sampleRate * totalDuration),
        sampleRate,
      );
      for (let bar = 0; bar < BARS_FOR_EXPORT; bar++) {
        for (let step = 0; step < STEP_COUNT; step++) {
          const absStep = bar * STEP_COUNT + step;
          const t = absStep * sd;
          for (const track of tracksRef.current) {
            if (!track.steps[step]) continue;
            const instrument = INSTRUMENTS.find(
              (i) => i.name === track.instrumentName,
            );
            if (!instrument) continue;
            synthesizeStep(offlineCtx, instrument, t, offlineCtx.destination);
          }
        }
      }
      const rendered = await offlineCtx.startRendering();
      const blob = audioBufferToWav(rendered);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `beat_${bpmRef.current}bpm.wav`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Beat exported as WAV!");
    } catch {
      toast.error("Export failed. Try again.");
    } finally {
      setIsExporting(false);
    }
  }, []);

  const toggleStep = (trackId: string, stepIndex: number) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        const steps = [...t.steps];
        steps[stepIndex] = !steps[stepIndex];
        return { ...t, steps };
      }),
    );
  };

  const addTrack = () => {
    if (tracks.length >= MAX_TRACKS) return;
    const randomInstr =
      INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)];
    setTracks((prev) => [...prev, createTrack(randomInstr.name)]);
  };

  const removeTrack = (trackId: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
  };

  const clearAll = () => {
    setTracks((prev) =>
      prev.map((t) => ({ ...t, steps: new Array(STEP_COUNT).fill(false) })),
    );
    toast.info("All steps cleared.");
  };

  const changeInstrument = (trackId: string, instrumentName: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, instrumentName } : t)),
    );
  };

  // Beat groups: 4 beats of 4 sixteenth notes each
  const stepGroups = [0, 4, 8, 12];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "oklch(0.08 0.01 240)" }}
      data-ocid="beatbuilder.modal"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "oklch(0.22 0.015 240)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: "oklch(0.85 0.18 75)",
              boxShadow: "0 0 16px oklch(0.85 0.18 75 / 0.6)",
            }}
          >
            <Music
              className="w-4 h-4"
              style={{ color: "oklch(0.1 0.01 240)" }}
            />
          </div>
          <div>
            <h2
              className="font-bold text-base"
              style={{
                color: "oklch(0.85 0.18 75)",
                textShadow: "0 0 14px oklch(0.85 0.18 75 / 0.5)",
              }}
            >
              Instrumental Studio
            </h2>
            <p className="text-xs" style={{ color: "oklch(0.55 0.01 240)" }}>
              {INSTRUMENTS.length}+ instruments · {tracks.length} tracks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* BPM */}
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onBpmChange(Math.max(60, bpm - 1))}
              data-ocid="beatbuilder.bpm.minus.button"
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span
              className="text-sm font-mono font-bold min-w-[3.5rem] text-center"
              style={{ color: "oklch(0.85 0.18 75)" }}
            >
              {bpm} BPM
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onBpmChange(Math.min(200, bpm + 1))}
              data-ocid="beatbuilder.bpm.plus.button"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          {/* Play/Stop */}
          <Button
            size="sm"
            className="gap-2"
            onClick={isPlaying ? stopPlayback : startPlayback}
            style={{
              background: isPlaying
                ? "oklch(0.67 0.22 15)"
                : "oklch(0.79 0.16 192)",
              color: "oklch(0.08 0.01 240)",
              boxShadow: isPlaying
                ? "0 0 12px oklch(0.67 0.22 15 / 0.5)"
                : "0 0 12px oklch(0.79 0.16 192 / 0.5)",
            }}
            data-ocid="beatbuilder.play.button"
          >
            {isPlaying ? (
              <Square className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            {isPlaying ? "Stop" : "Play"}
          </Button>

          {/* Export WAV */}
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={exportWav}
            disabled={isExporting}
            style={{
              borderColor: "oklch(0.72 0.2 300 / 0.5)",
              color: "oklch(0.72 0.2 300)",
            }}
            data-ocid="beatbuilder.export.button"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting…" : "Export WAV"}
          </Button>

          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-ocid="beatbuilder.close_button"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b flex-shrink-0"
        style={{ borderColor: "oklch(0.18 0.012 240)" }}
      >
        <Button
          size="sm"
          variant="outline"
          className="gap-2 text-xs"
          onClick={addTrack}
          disabled={tracks.length >= MAX_TRACKS}
          style={{
            borderColor: "oklch(0.79 0.16 192 / 0.4)",
            color: "oklch(0.79 0.16 192)",
          }}
          data-ocid="beatbuilder.add_track.button"
        >
          <Plus className="w-3 h-3" />
          Add Track
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-2 text-xs"
          onClick={clearAll}
          style={{
            borderColor: "oklch(0.67 0.22 15 / 0.4)",
            color: "oklch(0.67 0.22 15)",
          }}
          data-ocid="beatbuilder.clear.button"
        >
          <Trash2 className="w-3 h-3" />
          Clear All
        </Button>
        <span
          className="text-xs ml-auto"
          style={{ color: "oklch(0.55 0.01 240)" }}
        >
          16-step sequencer · {BARS_FOR_EXPORT} bars on export
        </span>
      </div>

      {/* Step Headers */}
      <div
        className="flex items-center gap-1 px-4 py-1 flex-shrink-0"
        style={{
          background: "oklch(0.1 0.012 240)",
          borderBottom: "1px solid oklch(0.18 0.012 240)",
        }}
      >
        {/* Instrument column spacer */}
        <div className="flex-shrink-0" style={{ width: 144 }} />
        <div className="flex-shrink-0" style={{ width: 28 }} />
        <div className="flex gap-1 flex-1 overflow-x-auto">
          {STEP_LABELS.map((label, i) => (
            <div
              key={label}
              className="flex-1 min-w-0 text-center"
              style={{
                fontSize: 9,
                color:
                  i % 4 === 0 ? "oklch(0.85 0.18 75)" : "oklch(0.45 0.01 240)",
                fontWeight: i % 4 === 0 ? 700 : 400,
              }}
            >
              {i % 4 === 0 ? i / 4 + 1 : "·"}
            </div>
          ))}
        </div>
      </div>

      {/* Tracks */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-2 space-y-1.5">
          {tracks.map((track, trackIndex) => {
            const color = NEON_COLORS[trackIndex % NEON_COLORS.length];
            return (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-1"
                data-ocid={`beatbuilder.track.item.${trackIndex + 1}`}
              >
                {/* Instrument Picker */}
                <div className="flex-shrink-0" style={{ width: 144 }}>
                  <InstrumentPicker
                    value={track.instrumentName}
                    onChange={(name) => changeInstrument(track.id, name)}
                  />
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeTrack(track.id)}
                  className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center transition-colors"
                  style={{
                    color: "oklch(0.67 0.22 15 / 0.6)",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "oklch(0.67 0.22 15)";
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "oklch(0.67 0.22 15 / 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "oklch(0.67 0.22 15 / 0.6)";
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                  }}
                  data-ocid={`beatbuilder.track.delete_button.${trackIndex + 1}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                {/* Steps */}
                <div className="flex gap-1 flex-1 overflow-x-auto">
                  {track.steps.map((active, stepIndex) => {
                    const isCurrent = isPlaying && stepIndex === currentStep;
                    const beatStart = stepGroups.includes(stepIndex);
                    return (
                      <button
                        type="button"
                        key={`${track.id}-${stepIndex}`}
                        onClick={() => toggleStep(track.id, stepIndex)}
                        className="flex-1 min-w-0 rounded-sm transition-all"
                        style={{
                          height: 28,
                          minWidth: 18,
                          background: active
                            ? isCurrent
                              ? color
                              : color.replace(")", " / 0.75)")
                            : isCurrent
                              ? "oklch(0.28 0.02 240)"
                              : beatStart
                                ? "oklch(0.18 0.015 240)"
                                : "oklch(0.15 0.012 240)",
                          border: `1px solid ${
                            active
                              ? color.replace(")", " / 0.6)")
                              : isCurrent
                                ? "oklch(0.35 0.02 240)"
                                : "oklch(0.22 0.015 240)"
                          }`,
                          boxShadow:
                            active && isCurrent
                              ? `0 0 8px ${color.replace(")", " / 0.8)")}`
                              : active
                                ? `0 0 4px ${color.replace(")", " / 0.4)")}`
                                : "none",
                        }}
                        data-ocid="beatbuilder.step.toggle"
                      />
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer hint */}
      <div
        className="px-4 py-2 border-t text-center flex-shrink-0"
        style={{ borderColor: "oklch(0.18 0.012 240)" }}
      >
        <p className="text-xs" style={{ color: "oklch(0.45 0.01 240)" }}>
          Click steps to toggle · Pick any of {INSTRUMENTS.length}+ instruments
          per track · Export WAV downloads 4 bars
        </p>
      </div>
    </div>
  );
}
