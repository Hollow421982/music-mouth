import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DetectedEvent,
  InstrumentPreset,
  ProjectWithId,
  SessionRecord,
  SoundMapping,
} from "../backend.d";
import { useActor } from "./useActor";

export function useGetAllPresets() {
  const { actor, isFetching } = useActor();
  return useQuery<InstrumentPreset[]>({
    queryKey: ["presets"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPresets();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllSessions() {
  const { actor, isFetching } = useActor();
  return useQuery<SessionRecord[]>({
    queryKey: ["sessions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllSessionRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllProjects() {
  const { actor, isFetching } = useActor();
  return useQuery<ProjectWithId[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllProjects();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreatePreset() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      mappings,
    }: { name: string; mappings: SoundMapping[] }) => {
      if (!actor) throw new Error("No actor");
      return actor.createPreset(name, mappings);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["presets"] }),
  });
}

export function useDeletePreset() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deletePreset(name);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["presets"] }),
  });
}

export function useAddSession() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (counts: {
      kick: number;
      snare: number;
      hihat: number;
      bass: number;
      melody: number;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.addSessionRecord(
        BigInt(counts.kick),
        BigInt(counts.snare),
        BigInt(counts.hihat),
        BigInt(counts.bass),
        BigInt(counts.melody),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
  });
}

export function useCreateProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      bpm,
      mappings,
      events,
    }: {
      name: string;
      bpm: bigint;
      mappings: SoundMapping[];
      events: DetectedEvent[];
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.createProject(name, bpm, mappings, events);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      bpm,
      mappings,
      events,
    }: {
      id: bigint;
      name: string;
      bpm: bigint;
      mappings: SoundMapping[];
      events: DetectedEvent[];
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateProject(id, name, bpm, mappings, events);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useDeleteProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteProject(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}
