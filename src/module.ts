import parseImports from "parse-es6-imports";

enum Resolver {
  skypack = "skypack",
  jspm = "jspm",
  local = "local",
}

/** Create script with content */
function createScript(type: "module" | "importmap", content: string | object) {
  const scriptElement = document.createElement("script");
  scriptElement.type = type;
  scriptElement.innerHTML =
    typeof content === "object" ? JSON.stringify(content) : content;
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
  const importmap = generateImportMap(source, resolver);

  // Transpiling code with typescript
  const module = window.ts.transpile(source, {
    target: window.ts.ScriptTarget.ESNext,
    module: window.ts.ModuleKind.ESNext,
    jsx: window.ts.JsxEmit.React,
    allowJs: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
  });

  return {
    importmap,
    module,
  };
}

/** Get inline script content or load from src */
async function getScriptContent(tag: HTMLScriptElement) {
  const src = tag.getAttribute("src");

  if (src) {
    const content = await fetch(src).then((res) => res.text());
    return content;
  }

  return tag.textContent;
}

/** Import scripts[ts-module-browser] */
async function importScriptsTags() {
  const modules: string[] = [];
  let importmaps: Record<string, string> = {};

  const tags = document.querySelectorAll("script[type=ts-module-browser]");
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const content = await getScriptContent(tag as HTMLScriptElement);

    if (content) {
      const resolver = tag.getAttribute("resolver") as Resolver;
      const result = generateModule(content, resolver);
      importmaps = { ...importmaps, ...result.importmap };
      modules.push(result.module);
    }
  }

  // Injecting scripts
  createScript("importmap", { imports: importmaps });
  modules.forEach((content) => {
    createScript("module", content);
  });

  tags.forEach((tag) => tag.remove());
}

/** Start compiling ts-module-browser */
export async function start() {
  await importScriptsTags();
}
