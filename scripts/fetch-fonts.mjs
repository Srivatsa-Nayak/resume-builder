// Downloads the resume template fonts (static TTFs from Google Fonts, all OFL
// licensed) into public/fonts. The files are committed, so this only needs
// re-running when src/lib/resume/font-list.json changes.
//
//   node scripts/fetch-fonts.mjs
//
// Google Fonts serves complete, non-subset TrueType files to clients that
// don't advertise WOFF2 support, which is what PDF embedding needs.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const fonts = JSON.parse(readFileSync(new URL("src/lib/resume/font-list.json", root), "utf8"));
const outDir = new URL("public/fonts/", root);
mkdirSync(outDir, { recursive: true });

for (const font of fonts) {
  const axes = font.italic ? "ital,wght@0,400;0,700;1,400;1,700" : "wght@400;700";
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.google).replace(/%20/g, "+")}:${axes}`;
  const css = await (await fetch(cssUrl)).text();
  const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(([, block]) => [
    block,
    block.match(/font-style:\s*(\w+)/)?.[1],
    block.match(/font-weight:\s*(\d+)/)?.[1],
    block.match(/src:\s*url\(([^)]+)\)/)?.[1],
  ]);
  if (!faces.length) throw new Error(`No font files found for ${font.google}:\n${css.slice(0, 300)}`);
  for (const [, style, weight, url] of faces) {
    const file = `${font.key}-${weight}${style === "italic" ? "-italic" : ""}.ttf`;
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    if (bytes.subarray(0, 4).toString("hex") !== "00010000" && bytes.subarray(0, 4).toString() !== "true") {
      throw new Error(`${file} is not a TrueType font`);
    }
    writeFileSync(new URL(file, outDir), bytes);
    console.log(`${file.padEnd(32)} ${(bytes.length / 1024).toFixed(0)} KB`);
  }
}
