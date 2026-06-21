import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Manga, TasteSeed } from "@/lib/types";

export type ReaderMode = "vertical" | "paged" | "double";
export type ReadDir = "ltr" | "rtl";
export type AutoSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;
export type AuthMethod = "google" | "discord" | "guest" | null;

export interface ProgressEntry {
  chapterId: string;
  chapter: string; // label, e.g. "12"
  page: number;
  scroll: number; // 0..1 within page (vertical)
  total: number; // chapters read marker (approx)
  title: string;
  coverThumb?: string;
  updatedAt: number;
}

export interface ReaderSettings {
  mode: ReaderMode;
  direction: ReadDir; // page-by-page reading direction (RTL = japonais)
  autoSpeed: AutoSpeed;
  smartAuto: boolean;
}

/** Per-work reading preference, so each title reopens exactly how you left it. */
export interface WorkReader {
  mode: ReaderMode;
  direction: ReadDir;
}

const DEFAULT_READER: ReaderSettings = { mode: "vertical", direction: "rtl", autoSpeed: 1, smartAuto: true };

function seedOf(m: Manga): TasteSeed {
  return { id: m.id, title: m.title, coverThumb: m.coverThumb, genres: m.genres, tags: m.tags };
}

interface State {
  hydrated: boolean;
  onboarded: boolean;
  auth: AuthMethod;
  displayName: string | null;

  picks: TasteSeed[];
  favorites: TasteSeed[];
  finished: string[];
  progress: Record<string, ProgressEntry>;
  reader: ReaderSettings;
  workReader: Record<string, WorkReader>;
  gatewayUrl: string;

  // transient — the colour currently lighting the room
  ambientColor?: string;
  ambientId?: string;

  setHydrated(): void;
  completeOnboarding(picks: TasteSeed[], auth: AuthMethod, name?: string): void;
  isFavorite(id: string): boolean;
  toggleFavorite(m: Manga): void;
  markFinished(id: string): void;
  setProgress(mangaId: string, entry: ProgressEntry): void;
  updateReader(patch: Partial<ReaderSettings>): void;
  setWorkReader(id: string, patch: Partial<WorkReader>): void;
  setAmbient(color?: string, id?: string): void;
  setGateway(url: string): void;
  resetAll(): void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      onboarded: false,
      auth: null,
      displayName: null,
      picks: [],
      favorites: [],
      finished: [],
      progress: {},
      reader: DEFAULT_READER,
      workReader: {},
      gatewayUrl: "",
      ambientColor: undefined,
      ambientId: undefined,

      setHydrated: () => set({ hydrated: true }),

      completeOnboarding: (picks, auth, name) =>
        set({ onboarded: true, picks, auth, displayName: name ?? get().displayName ?? null }),

      isFavorite: (id) => get().favorites.some((f) => f.id === id),

      toggleFavorite: (m) =>
        set((s) => ({
          favorites: s.favorites.some((f) => f.id === m.id)
            ? s.favorites.filter((f) => f.id !== m.id)
            : [seedOf(m), ...s.favorites],
        })),

      markFinished: (id) =>
        set((s) => ({ finished: s.finished.includes(id) ? s.finished : [...s.finished, id] })),

      setProgress: (mangaId, entry) =>
        set((s) => ({ progress: { ...s.progress, [mangaId]: entry } })),

      updateReader: (patch) => set((s) => ({ reader: { ...s.reader, ...patch } })),

      setWorkReader: (id, patch) =>
        set((s) => ({ workReader: { ...s.workReader, [id]: { ...(s.workReader[id] ?? { mode: s.reader.mode, direction: s.reader.direction }), ...patch } } })),

      setAmbient: (color, id) => set({ ambientColor: color, ambientId: id }),

      setGateway: (url) => set({ gatewayUrl: url.trim().replace(/\/+$/, "") }),

      resetAll: () =>
        set({
          onboarded: false, auth: null, displayName: null, picks: [], favorites: [],
          finished: [], progress: {}, reader: DEFAULT_READER, workReader: {},
        }),
    }),
    {
      name: "tsuki-scans-v2",
      partialize: (s) => ({
        onboarded: s.onboarded,
        auth: s.auth,
        displayName: s.displayName,
        picks: s.picks,
        favorites: s.favorites,
        finished: s.finished,
        progress: s.progress,
        reader: s.reader,
        workReader: s.workReader,
        gatewayUrl: s.gatewayUrl,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
