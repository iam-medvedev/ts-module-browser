import parseImports from "parse-es6-imports";

enum Resolver {
  skypack = "skypack",
  jspm = "jspm",
  local = "local",
}

/** Create script with content */
function createScript(type: "module" | "importmap", content: string) {
  const scriptElement = document.createElement("script");
  scriptElement.type = type;
  scriptElement.innerHTML = content;
  document.head.appendChild(scriptElement);
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
function generateImportMap(source: string, resolver?: Resolver) {
  const imports = parseImports(source);
  const newImports: Record<string, string> = {};
  const prefix = getPathForResolver(resolver);

  for (const im of imports) {
    if (!isLocalDependency(im.fromModule)) {
      newImports[im.fromModule] = `${prefix}${im.fromModule}`;
    }
  }

  return newImports;
}

/** Generate script module and importmap for source code */
function generateModule(source: string, resolver: Resolver) {
  const importsMap = generateImportMap(source, resolver);
  createScript("importmap", JSON.stringify({ imports: importsMap }));

  // Transpiling code with typescript
  const result = window.ts.transpile(source, {
    target: window.ts.ScriptTarget.ESNext,
    module: window.ts.ModuleKind.ESNext,
    jsx: window.ts.JsxEmit.React,
    allowJs: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
  });

  createScript("module", result);
}

/** Import scripts[ts-module-browser] */
function importScriptsTags() {
  const tags = document.querySelectorAll("script[type=ts-module-browser]");

  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const content = tag.textContent;
    const resolver = tag.getAttribute("resolver") as Resolver;

    if (content) {
      generateModule(content, resolver);
    }
  }
}

/** Start compiling ts-module-browser */
export function start() {
  importScriptsTags();
}
