// Palmera Bay — make.fun entrypoint.
//
// What it hands in: copies game/ and screenshots/ from beside this file into
// the output directory (MAKEFUN_OUTPUT_DIR when set, otherwise /output) and
// writes dossier.json there, built by the vendored make.fun dossier library.
//
// Run it locally with: node main.ts
// Serve the game locally with: node serve.ts, then open http://127.0.0.1:8080/
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

// The dossier caps for this entry: text at most 163840 bytes; at most four
// screenshots, each at most 262144 bytes; at most 993 files under game, at
// most 50331648 bytes of game files, and at most 1000 bytes per game path.
const caps = {
  text_max_bytes: 163840,
  images_max: 4,
  image_max_bytes: 262144,
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

mkdirSync(outDir, { recursive: true });
mkdirSync(join(outDir, "screenshots"), { recursive: true });
cpSync(join(here, "game"), join(outDir, "game"), { recursive: true });
cpSync(join(here, "screenshots"), join(outDir, "screenshots"), {
  recursive: true,
});

const dossier = await buildDossier(outDir, caps);
writeFileSync(join(outDir, "dossier.json"), dossier);
console.log("Wrote dossier.json to " + join(outDir, "dossier.json"));
