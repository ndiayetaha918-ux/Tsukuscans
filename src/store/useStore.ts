import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BehaviorSignal } from "@/lib/recommend";

export type ReaderMode = "vertical" | "paged" | "double";
export type AutoSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

export interface ProgressEntry {
  chapterId: string;
  chapterNumber: number;
  page: number; // 0-based page within chapter
  scroll: number; // 0..1 fractional scroll within the page (vertical mode)
  updatedAt: number;
}

export interface ReaderSettings {
  mode: ReaderMode;
  autoSpeed: AutoSpeed;
  smartAuto: boolean;
  immersive: boolean;
}

export interface Repository {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export type AuthMethod = "google" | "discord" | "guest" | null;

interface State {
  hydrated: boolean;
  onboarded: boolean;
  auth: AuthMethod;
  displayName: string | null;

  picks: string[];
  favorites: string[];
  finished: string[];
  abandoned: string[];
  progress: Record<string, ProgressEntry>;
  downloads: Record<string, string[]>; // mangaId -> chapterIds available offline

  reader: ReaderSettings;
  repositories: Repository[];

  // actions
  setHydrated(): void;
  completeOnboarding(picks: string[], auth: AuthMethod, name?: string): void;
  setAuth(auth: AuthMethod, name?: string): void;
  toggleFavorite(id: string): void;
  markFinished(id: string): void;
  markAbandoned(id: string): void;
  resumeReading(id: string): void;
  setProgress(mangaId: string, entry: ProgressEntry): void;
  toggleDownloadChapter(mangaId: string, chapterId: string): void;
  toggleDownloadAll(mangaId: string, chapterIds: string[]): void;
  updateReader(patch: Partial<ReaderSettings>): void;
  addRepository(repo: Repository): void;
  toggleRepository(id: string): void;
  removeRepository(id: string): void;
  resetAll(): void;

  behaviorSignal(): BehaviorSignal;
}

const without = (arr: string[], id: string) => arr.filter((x) => x !== id);
const withId = (arr: string[], id: string) => (arr.includes(id) ? arr : [...arr, id]);

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
      abandoned: [],
      progress: {},
      downloads: {},
      reader: { mode: "vertical", autoSpeed: 1, smartAuto: true, immersive: false },
      repositories: [
        {
          id: "keiyoushi",
          name: "Keiyoushi",
          url: "https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json",
          enabled: true,
        },
      ],

      setHydrated: () => set({ hydrated: true }),

      completeOnboarding: (picks, auth, name) =>
        set({ onboarded: true, picks, auth, displayName: name ?? get().displayName ?? null }),

      setAuth: (auth, name) => set({ auth, displayName: name ?? get().displayName ?? null }),

      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id) ? without(s.favorites, id) : withId(s.favorites, id),
        })),

      markFinished: (id) =>
        set((s) => ({ finished: withId(s.finished, id), abandoned: without(s.abandoned, id) })),

      markAbandoned: (id) =>
        set((s) => ({ abandoned: withId(s.abandoned, id) })),

      resumeReading: (id) =>
        set((s) => ({ abandoned: without(s.abandoned, id) })),

      setProgress: (mangaId, entry) =>
        set((s) => ({ progress: { ...s.progress, [mangaId]: entry } })),

      toggleDownloadChapter: (mangaId, chapterId) =>
        set((s) => {
          const cur = s.downloads[mangaId] ?? [];
          const next = cur.includes(chapterId)
            ? cur.filter((c) => c !== chapterId)
            : [...cur, chapterId];
          const downloads = { ...s.downloads };
          if (next.length) downloads[mangaId] = next;
          else delete downloads[mangaId];
          return { downloads };
        }),

      toggleDownloadAll: (mangaId, chapterIds) =>
        set((s) => {
          const cur = s.downloads[mangaId] ?? [];
          const allDown = chapterIds.every((c) => cur.includes(c));
          const downloads = { ...s.downloads };
          if (allDown) delete downloads[mangaId];
          else downloads[mangaId] = chapterIds;
          return { downloads };
        }),

      updateReader: (patch) => set((s) => ({ reader: { ...s.reader, ...patch } })),

      addRepository: (repo) =>
        set((s) => ({
          repositories: s.repositories.some((r) => r.id === repo.id)
            ? s.repositories
            : [...s.repositories, repo],
        })),

      toggleRepository: (id) =>
        set((s) => ({
          repositories: s.repositories.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
        })),

      removeRepository: (id) =>
        set((s) => ({ repositories: s.repositories.filter((r) => r.id !== id) })),

      resetAll: () =>
        set({
          onboarded: false, auth: null, displayName: null, picks: [], favorites: [],
          finished: [], abandoned: [], progress: {}, downloads: {},
          reader: { mode: "vertical", autoSpeed: 1, smartAuto: true, immersive: false },
        }),

      behaviorSignal: () => {
        const s = get();
        const reading = Object.entries(s.progress)
          .filter(([id]) => !s.finished.includes(id))
          .map(([mangaId, p]) => ({ mangaId, progress: estimateProgress(p) }));
        return {
          picks: s.picks,
          favorites: s.favorites,
          finished: s.finished,
          abandoned: s.abandoned,
          reading,
        };
      },
    }),
    {
      name: "tsuki-scans-v1",
      // Persist data only — never the action functions or the transient flag.
      partialize: (s) => ({
        onboarded: s.onboarded,
        auth: s.auth,
        displayName: s.displayName,
        picks: s.picks,
        favorites: s.favorites,
        finished: s.finished,
        abandoned: s.abandoned,
        progress: s.progress,
        downloads: s.downloads,
        reader: s.reader,
        repositories: s.repositories,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

function estimateProgress(p: ProgressEntry): number {
  // Rough completion of the manga from chapter number; good enough as a signal.
  return Math.max(0, Math.min(1, (p.chapterNumber - 1 + p.scroll) / 40));
}
