import { useCallback, useEffect, useRef } from "react";
import { getInstrumentByName } from "../data/instruments";

export interface RecordedNote {
  channelId: number;
  timestamp: number;
  intensity: number;
}

interface AudioEngineOptions {
  bpm: number;
  instrumentMap: Record<number, string>;
  onLevelsUpdate: (levels: number[]) => void;
  onNoteTriggered: (note: RecordedNote) => void;
}

const FREQ_BANDS: [number, number][] = [
  [200, 700],
  [20, 150],
  [150, 450],
  [4000, 9000],
  [1500, 3000],
  [800, 1500],
  [7000, 15000],
  [2000, 5000],
  [500, 900],
  [3000, 6000],
];

const CHANNEL_THRESHOLDS = [40, 60, 45, 35, 50, 55, 30, 40, 45, 50];

export function useAudioEngine(options: AudioEngineOptions) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastTriggerRef = useRef<number[]>(new Array(10).fill(0));
  const isRecordingRef = useRef(false);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const synthesizeSound = useCallback(
    (channelId: number, intensity: number) => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const instrName = optionsRef.current.instrumentMap[channelId];
      const instr = getInstrumentByName(instrName);
      if (!instr) return;

      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);

      const vol = Math.min(0.4, 0.1 + (intensity / 255) * 0.3);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (instr.decay ?? 0.3));

      if (channelId === 1 || channelId === 4) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime((instr.baseFreq ?? 80) * 2, now);
        osc.frequency.exponentialRampToValueAtTime(
          instr.baseFreq ?? 60,
          now + 0.1,
        );
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + (instr.decay ?? 0.4));
      } else if (channelId === 2) {
        const osc = ctx.createOscillator();
        osc.type = instr.waveform ?? "sawtooth";
        osc.frequency.setValueAtTime(instr.baseFreq ?? 200, now);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + (instr.decay ?? 0.15));
        const bufLen = ctx.sampleRate * 0.1;
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(vol * 0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        noiseGain.connect(ctx.destination);
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = buf;
        noiseSrc.connect(noiseGain);
        noiseSrc.start(now);
      } else if (channelId === 3 || channelId === 6) {
        const bufLen = ctx.sampleRate * (instr.decay ?? 0.05);
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
        const filter = ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = instr.baseFreq ?? 8000;
        filter.connect(gain);
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = buf;
        noiseSrc.connect(filter);
        noiseSrc.start(now);
      } else {
        const osc = ctx.createOscillator();
        osc.type = instr.waveform ?? "sine";
        osc.frequency.setValueAtTime(instr.baseFreq ?? 440, now);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + (instr.decay ?? 0.3));
      }
    },
    [],
  );

  const analyzeFrame = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser || !isRecordingRef.current) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const sampleRate = audioCtxRef.current?.sampleRate ?? 44100;
    const binSize = sampleRate / analyser.fftSize;
    const levels: number[] = [];
    const now = Date.now();

    for (let ch = 0; ch < 10; ch++) {
      const [lo, hi] = FREQ_BANDS[ch];
      const binLo = Math.floor(lo / binSize);
      const binHi = Math.min(Math.ceil(hi / binSize), bufferLength - 1);
      let sum = 0;
      for (let b = binLo; b <= binHi; b++) sum += dataArray[b];
      const avg = binHi > binLo ? sum / (binHi - binLo + 1) : 0;
      levels.push(avg / 255);

      const threshold = CHANNEL_THRESHOLDS[ch];
      const cooldown = 80;
      if (avg > threshold && now - lastTriggerRef.current[ch] > cooldown) {
        lastTriggerRef.current[ch] = now;
        synthesizeSound(ch, avg);
        optionsRef.current.onNoteTriggered({
          channelId: ch,
          timestamp: now,
          intensity: avg,
        });
      }
    }

    optionsRef.current.onLevelsUpdate(levels);
    rafRef.current = requestAnimationFrame(analyzeFrame);
  }, [synthesizeSound]);

  const startRecording = useCallback(async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") await ctx.resume();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    streamRef.current = stream;

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.5;
    source.connect(analyser);
    analyserRef.current = analyser;

    isRecordingRef.current = true;
    rafRef.current = requestAnimationFrame(analyzeFrame);
  }, [analyzeFrame]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
    }
    streamRef.current = null;
    analyserRef.current = null;
  }, []);

  const playbackNotes = useCallback(
    (
      notes: RecordedNote[],
      bpm: number,
      loop: boolean,
      onFinish: () => void,
    ) => {
      const ctx = audioCtxRef.current;
      if (!ctx || notes.length === 0) {
        onFinish();
        return;
      }

      const beatMs = 60000 / bpm;
      const gridMs = beatMs / 4;
      const startTime = notes[0].timestamp;
      const endTime = notes[notes.length - 1].timestamp;
      const duration = endTime - startTime + 500;
      const quantize = (ts: number) =>
        Math.round((ts - startTime) / gridMs) * gridMs;
      const scheduledNotes = notes.map((n) => ({
        ...n,
        qts: quantize(n.timestamp),
      }));
      const audioStart = ctx.currentTime + 0.1;

      for (const n of scheduledNotes) {
        const instrName = optionsRef.current.instrumentMap[n.channelId];
        const instr = getInstrumentByName(instrName);
        if (!instr) continue;
        const t = audioStart + n.qts / 1000;
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        const vol = Math.min(0.4, 0.1 + (n.intensity / 255) * 0.3);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + (instr.decay ?? 0.3));
        const osc = ctx.createOscillator();
        osc.type = instr.waveform ?? "sine";
        osc.frequency.setValueAtTime(instr.baseFreq ?? 440, t);
        osc.connect(gain);
        osc.start(t);
        osc.stop(t + (instr.decay ?? 0.3));
      }

      const timer = setTimeout(() => {
        if (loop) playbackNotes(notes, bpm, loop, onFinish);
        else onFinish();
      }, duration + 200);

      return () => clearTimeout(timer);
    },
    [],
  );

  const exportToWav = useCallback(
    async (
      notes: RecordedNote[],
      bpm: number,
      instrumentMap: Record<number, string>,
    ): Promise<Blob> => {
      if (notes.length === 0) return new Blob([], { type: "audio/wav" });

      const sampleRate = 44100;
      const beatMs = 60000 / bpm;
      const gridMs = beatMs / 4;
      const startTime = notes[0].timestamp;
      const endTime = notes[notes.length - 1].timestamp;
      const durationSec = (endTime - startTime) / 1000 + 2;

      const offlineCtx = new OfflineAudioContext(
        2,
        Math.ceil(sampleRate * durationSec),
        sampleRate,
      );
      const quantize = (ts: number) =>
        Math.round((ts - startTime) / gridMs) * gridMs;

      for (const n of notes) {
        const instrName = instrumentMap[n.channelId];
        const instr = getInstrumentByName(instrName);
        if (!instr) continue;
        const t = quantize(n.timestamp) / 1000;
        const gain = offlineCtx.createGain();
        gain.connect(offlineCtx.destination);
        const vol = Math.min(0.3, 0.08 + (n.intensity / 255) * 0.22);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + (instr.decay ?? 0.3));
        const osc = offlineCtx.createOscillator();
        osc.type = instr.waveform ?? "sine";
        osc.frequency.setValueAtTime(instr.baseFreq ?? 440, t);
        osc.connect(gain);
        osc.start(t);
        osc.stop(t + (instr.decay ?? 0.3));
      }

      const rendered = await offlineCtx.startRendering();
      return audioBufferToWav(rendered);
    },
    [],
  );

  return { startRecording, stopRecording, playbackNotes, exportToWav };
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
