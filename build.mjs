import { copyFile, mkdir } from "node:fs/promises";
import { build } from "esbuild";

const clientFiles = ["index.html", "app.mjs", "game.mjs", "style.css", "splash.html", "splash.css"];
await mkdir("dist/client", { recursive: true });
await Promise.all(clientFiles.map((file) => copyFile(file, "dist/client/" + file)));
await Promise.all([
  build({
    entryPoints: ["splash.mjs"],
    outfile: "dist/client/splash.js",
    bundle: true,
    platform: "browser",
    format: "esm",
  }),
  build({
    entryPoints: ["server.mjs"],
    outfile: "dist/server/index.cjs",
    bundle: true,
    platform: "node",
    target: "node22",
    format: "cjs",
  }),
]);
