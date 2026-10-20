export const THEME_IDS = [
  "violet",
  "cinema",
  "cyberpunk",
  "anime",
  "superhero",
  "noir",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "violet";

export const THEMES: {
  id: ThemeId;
  name: string;
  blurb: string;
  swatches: [string, string, string];
}[] = [
  {
    id: "violet",
    name: "Violet Night",
    blurb: "Deep blacks with electric purple",
    swatches: ["#07060c", "#a78bfa", "#7c3aed"],
  },
  {
    id: "cinema",
    name: "Cinema Gold",
    blurb: "Warm film-house amber",
    swatches: ["#0c0b09", "#d4a373", "#e8c49a"],
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    blurb: "Neon cyan & magenta grit",
    swatches: ["#05050a", "#22d3ee", "#f472b6"],
  },
  {
    id: "anime",
    name: "Anime Soft",
    blurb: "Pastel sakura & sky",
    swatches: ["#0e0a12", "#f9a8d4", "#7dd3fc"],
  },
  {
    id: "superhero",
    name: "Superhero",
    blurb: "Bold comic red & blue",
    swatches: ["#07070c", "#ef4444", "#3b82f6"],
  },
  {
    id: "noir",
    name: "Noir",
    blurb: "Stark silver contrast",
    swatches: ["#050505", "#e5e5e5", "#a3a3a3"],
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

export const THEME_STORAGE_KEY = "ms_theme";
