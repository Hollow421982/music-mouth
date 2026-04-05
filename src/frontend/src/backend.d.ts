import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ProjectWithId {
    id: bigint;
    project: InstrumentalProject;
}
export type Time = bigint;
export interface SessionRecord {
    melodyCount: bigint;
    kickCount: bigint;
    snareCount: bigint;
    timestamp: Time;
    hihatCount: bigint;
    bassCount: bigint;
}
export interface InstrumentPreset {
    name: string;
    mappings: Array<SoundMapping>;
}
export interface DetectedEvent {
    instrument: string;
    time: bigint;
    soundType: string;
    intensity: number;
}
export interface SoundMapping {
    instrument: string;
    mouthSound: string;
}
export interface InstrumentalProject {
    bpm: bigint;
    name: string;
    events: Array<DetectedEvent>;
    timestamp: Time;
    mappings: Array<SoundMapping>;
}
export interface backendInterface {
    addSessionRecord(kickCount: bigint, snareCount: bigint, hihatCount: bigint, bassCount: bigint, melodyCount: bigint): Promise<void>;
    createPreset(name: string, mappings: Array<SoundMapping>): Promise<void>;
    createProject(name: string, bpm: bigint, mappings: Array<SoundMapping>, events: Array<DetectedEvent>): Promise<bigint>;
    deletePreset(name: string): Promise<void>;
    deleteProject(id: bigint): Promise<void>;
    getAllPresets(): Promise<Array<InstrumentPreset>>;
    getAllProjects(): Promise<Array<ProjectWithId>>;
    getAllSessionRecords(): Promise<Array<SessionRecord>>;
    getPreset(name: string): Promise<InstrumentPreset | null>;
    getProject(id: bigint): Promise<InstrumentalProject | null>;
    updatePreset(name: string, mappings: Array<SoundMapping>): Promise<void>;
    updateProject(id: bigint, name: string, bpm: bigint, mappings: Array<SoundMapping>, events: Array<DetectedEvent>): Promise<void>;
}
