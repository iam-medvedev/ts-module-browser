export type TraverseResult = {
  packages: Record<string, string>;
  filePaths: Record<string, string>;
  modules: string[];
};

export const localSearchPath = "/__tsmb-search__/";

export function normalizeFilePath(str: string) {
  return str.replace(/^\./, "").replace(/\/$/, "");
}

export function whetherFileIsScript(src: string) {
  const exts = ["js", "ts", "tsx"];
  return exts.some((ext) => src.endsWith(ext));
}

/** Resolve two paths */
export function resolvePath(origin: string, newPath: string) {
  return new URL(newPath, origin).href;
}

/** Create script with content */
export function createScript(
  type: "module" | "importmap",
  content: string | object
) {
  const scriptElement = document.createElement("script");
  scriptElement.type = type;
  scriptElement.innerHTML =
    typeof content === "object" ? JSON.stringify(content) : content;
  document.head.appendChild(scriptElement);
}

export enum Resolver {
  skypack = "skypack",
  jspm = "jspm",
  local = "local",
}

/** Detect whether dependency is a local file */
export function isLocalDependency(str: string) {
  return str.startsWith("/") || str.startsWith(".");
}

/** Get package path prefix */
export function getPathForResolver(resolver: Resolver = Resolver.local) {
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

/** Parse dependencies names from source */
export function parseImports(source: string) {
  const regex = new RegExp(
    /(?:(?<=(?:import|export)[^`'"]*from\s+[`'"])(?<path1>[^`'"]+)(?=(?:'|"|`)))|(?:\b(?:import|export)(?:\s+|\s*\(\s*)[`'"](?<path2>[^`'"]+)[`'"])/gi
  );

  const matches = source.match(regex);
  return matches?.length ? [...new Set(matches)] : [];
}

const logPrefix = "[ts-module-browser]";
export const log = {
  log: (...message: any[]) => console.log(logPrefix, ...message),
  info: (...message: any[]) => console.info(logPrefix, ...message),
  error: (...message: any[]) => console.error(logPrefix, ...message),
};

export class ModuleError extends Error {
  name = logPrefix;

  constructor(message: string) {
    super(message);
  }
}
