import * as path from "path";
import { build } from "esbuild";

const isProduction = process.env.NODE_ENV === "production";
const outfile = isProduction
  ? path.resolve(__dirname, "../dist/ts-module-browser.js")
  : path.resolve(__dirname, "../example/ts-module-browser.js");

build({
  bundle: true,
  watch: !isProduction,
  minify: isProduction,
  entryPoints: {
    module: path.resolve(__dirname, "../src/index.ts"),
  },
  outfile,
  loader: {
    ".ts": "ts",
  },
}).catch(() => {
  process.exit(1);
});
