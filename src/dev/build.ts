import * as path from "path";
import { build } from "esbuild";

build({
  watch: true,
  entryPoints: {
    module: path.resolve(__dirname, "../module.ts"),
  },
  outfile: path.resolve(__dirname, "./module.js"),
  loader: {
    ".ts": "ts",
  },
}).catch(() => {
  process.exit(1);
});
