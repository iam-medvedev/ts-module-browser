import * as path from "path";
import { build } from "esbuild";

const isProduction = process.env.NODE_ENV === "production";
const outdir = isProduction
  ? path.resolve(__dirname, "../dist")
  : path.resolve(__dirname, "../example");

build({
  bundle: true,
  watch: !isProduction,
  minify: isProduction,
  entryPoints: {
    module: path.resolve(__dirname, "../src/index.ts"),
    sw: path.resolve(__dirname, "../src/sw.ts"),
  },
  outdir,
  loader: {
    ".ts": "ts",
  },
}).catch(() => {
  process.exit(1);
});
