import {
  JsxEmit,
  ModuleKind,
  ScriptTarget,
  transpile as transpileTs,
} from "typescript";
import parseImports from "parse-es6-imports";

export enum Resolver {
  skypack = "skypack",
  jspm = "jspm",
  local = "local",
}

/** Detect whether dependency is a local file */
function isLocalDependency(str: string) {
  return str.startsWith("/") || str.startsWith(".");
}

/** File path prefix */
function getPathForResolver(resolver: Resolver = Resolver.local) {
  switch (resolver) {
    case Resolver.local:
      return "/node_modules/";
    case Resolver.jspm:
      return "https://jspm.dev/npm:";
    case Resolver.skypack:
      return "https://cdn.skypack.dev/";
    default:
      return "";
  }
}

/** Generate importmap with packages from CDN or local node_modules */
export function generateImportMap(source: string, resolver?: Resolver) {
  const imports = parseImports(source);
  const packages: Record<string, string> = {};
  const localFiles: string[] = [];
  const prefix = getPathForResolver(resolver);

  for (const im of imports) {
    if (isLocalDependency(im.fromModule)) {
      localFiles.push(im.fromModule);
    } else {
      packages[im.fromModule] = `${prefix}${im.fromModule}`;
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
