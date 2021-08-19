import {
  JsxEmit,
  ModuleKind,
  ScriptTarget,
  transpile as transpileTs,
} from "typescript";
import {
  getPathForResolver,
  isLocalDependency,
  parseImports,
  resolvePath,
  Resolver,
} from "./utils";

/** Generate importmap with packages from CDN or local node_modules */
export async function getSourceDependencies({
  source,
  resolver,
  root,
}: {
  source: string;
  resolver?: Resolver;
  root?: string;
}) {
  const imports = parseImports(source);
  const packages: Record<string, string> = {};
  const localFiles: string[] = [];
  const prefix = getPathForResolver(resolver);

  for (const im of imports) {
    if (isLocalDependency(im)) {
      localFiles.push(root ? resolvePath(root, im) : im);
    } else {
      packages[im] = `${prefix}${im}`;
    }
  }

  return { packages, localFiles };
}

/** Typescript transpiler */
export function transpile(source: string) {
  return transpileTs(source, {
    target: ScriptTarget.ESNext,
    module: ModuleKind.ESNext,
    jsx: JsxEmit.React,
    allowJs: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
  });
}
