import esbuild, { BuildOptions } from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// import gzipPlugin from "@luncheon/esbuild-plugin-gzip";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
);

const sharedConfig: BuildOptions = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  sourcemap: true,
  target: "esnext",
  treeShaking: true,
  minify: true,
  // write: false,
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
  // plugins: [
  //   gzipPlugin({
  //     gzip: true,
  //     brotli: true,
  //   }),
  // ],
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
  platform: "node",
  outfile: "dist/module.js",
});
