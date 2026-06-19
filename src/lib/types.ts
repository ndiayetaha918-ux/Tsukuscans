export type Genre =
  | "Dark Fantasy"
  | "Romance"
  | "Action"
  | "Psychological"
  | "Sport"
  | "Seinen"
  | "Shonen"
  | "Sci-Fi"
  | "Slice of Life"
  | "Horror"
  | "Adventure"
  | "Mystery";

export type Demographic = "Shonen" | "Seinen" | "Shojo" | "Josei";

export interface Chapter {
  id: string;
  number: number;
  title: string;
  pages: number;
  releasedAt: string; // ISO
}

export interface Manga {
  id: string;
  title: string;
  author: string;
  year: number;
  status: "En cours" | "Terminé" | "En pause";
  demographic: Demographic;
  genres: Genre[];
  tags: string[];
  synopsis: string;
  tagline: string;
  rating: number; // 0..10
  popularity: number; // 0..100, higher = more mainstream
  /** Deterministic palette anchors for procedural cover art (hue degrees). */
  palette: [number, number];
  /** Visual motif key picked by CoverArt for variety. */
  motif: "eclipse" | "rift" | "tide" | "bloom" | "circuit" | "ink";
  chapters: Chapter[];
  /** Which source/connector this title came from. */
  sourceId: string;
}

export interface SourceDescriptor {
  id: string;
  name: string;
  lang: string;
  baseUrl?: string;
  nsfw?: boolean;
}

/** A content connector. Local catalog implements it fully; remote repo
 *  connectors (Keiyoushi-compatible) advertise availability and metadata. */
export interface MangaSource {
  id: string;
  name: string;
  kind: "local" | "remote";
  enabled: boolean;
  /** Fetch the browsable catalog. Remote connectors may return [] until a
   *  native bridge is attached; the descriptor still proves the repo works. */
  list(): Promise<Manga[]>;
}

export interface RepositoryManifest {
  id: string;
  url: string;
  name: string;
  enabled: boolean;
  sources: SourceDescriptor[];
}
