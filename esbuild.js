import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
);

const sharedConfig = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  sourcemap: true,
  target: "esnext",
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
};

// Build CommonJS
esbuild.build({
  ...sharedConfig,
  format: "cjs",
  platform: "node",
  outfile: "dist/main.js",
});

// Build ESM
esbuild.build({
  ...sharedConfig,
  format: "esm",
  platform: "neutral",
  outfile: "dist/module.js",
});
