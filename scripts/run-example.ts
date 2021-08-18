import * as path from "path";
import { build } from "esbuild";

build({
  bundle: true,
  watch: true,
  minify: true,
  entryPoints: {
    module: path.resolve(__dirname, "../src/index.ts"),
  },
  outfile: path.resolve(__dirname, "../example/ts-module.js"),
  loader: {
    ".ts": "ts",
  },
}).catch(() => {
  process.exit(1);
});
