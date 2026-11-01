// Contact icons drawn as vector shapes (24×24, stroked, Lucide-style; ISC
// licensed). They are paths, not text, so exported PDFs read exactly the
// same to applicant tracking systems with or without them.

export type IconName = "mail" | "phone" | "location" | "globe" | "linkedin" | "github";

export type IconShape =
  | { type: "path"; d: string }
  | { type: "circle"; cx: number; cy: number; r: number }
  | { type: "rect"; x: number; y: number; width: number; height: number; rx?: number };

export const ICONS: Record<IconName, IconShape[]> = {
  mail: [
    { type: "rect", x: 2, y: 4, width: 20, height: 16, rx: 2 },
    { type: "path", d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" },
  ],
  phone: [
    {
      type: "path",
      d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
    },
  ],
  location: [
    { type: "path", d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" },
    { type: "circle", cx: 12, cy: 10, r: 3 },
  ],
  globe: [
    { type: "circle", cx: 12, cy: 12, r: 10 },
    { type: "path", d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" },
    { type: "path", d: "M2 12h20" },
  ],
  linkedin: [
    { type: "path", d: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" },
    { type: "rect", x: 2, y: 9, width: 4, height: 12 },
    { type: "circle", cx: 4, cy: 4, r: 2 },
  ],
  github: [
    {
      type: "path",
      d: "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4",
    },
    { type: "path", d: "M9 18c-4.51 2-5-2-7-2" },
  ],
};
