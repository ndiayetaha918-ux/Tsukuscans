// Domain model. Content comes live from MangaDex (a real, CORS-open source from
// the Tachiyomi/Keiyoushi ecosystem), so every title carries a real cover.

export interface Manga {
  id: string;
  title: string;
  author: string;
  year?: number;
  status: string; // localized FR label
  demographic?: string; // shonen / seinen / shojo / josei
  genres: string[]; // tag names, "genre" group
  tags: string[]; // tag names, theme group
  synopsis: string;
  rating?: number; // 0..10
  follows?: number; // popularity signal
  coverUrl?: string; // large
  coverThumb?: string; // medium
  banner?: string; // wide 16:9 art (AniList bannerImage)
  color?: string; // dominant cover colour (hex) for placeholders
  trailer?: { id: string; site: string }; // e.g. { id, site: "youtube" }
  searchTitles?: string[]; // english / romaji / native — for reading-source lookup
  chapters?: number; // total chapter count from AniList (for gap detection)
  contentRating?: string;
}

export interface Chapter {
  id: string;
  chapter: string; // "1", "12.5"…
  title: string;
  pages: number;
  publishAt: string;
  group?: string;
  lang: string;
  source: "comick" | "mangadex" | "static" | "animesama";
  color?: boolean; // colorized version of this chapter
  // For source "static": the MangaDex content hash + page filenames, pre-fetched
  // into the library so pages can be hotlinked from uploads.mangadex.org with no
  // live API call (zero relay, zero deploy).
  hash?: string;
  files?: string[];
}

/** Minimal taste record persisted from onboarding picks + behaviour. */
export interface TasteSeed {
  id: string;
  title: string;
  coverThumb?: string;
  genres: string[];
  tags: string[];
}

export interface SourceDescriptor {
  id: string;
  name: string;
  lang: string;
  baseUrl?: string;
  nsfw?: boolean;
}

export interface RepositoryManifest {
  id: string;
  url: string;
  name: string;
  enabled: boolean;
  sources: SourceDescriptor[];
}
