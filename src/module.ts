import { localSearchPath } from "./common";
import { generateImportMap, Resolver, transpile } from "./transpiler";

/** Injecting scripts in DOM */
function injectScripts({
  importmap,
  modules,
}: {
  modules: string[];
  importmap: Record<string, string>;
}) {
  // Importmap should be injected before any module
  createScript("importmap", { imports: importmap });

  // Injecting modules
  for (const content of modules) {
    createScript("module", content);
  }
}

/** Create script with content */
function createScript(type: "module" | "importmap", content: string | object) {
  const scriptElement = document.createElement("script");
  scriptElement.type = type;
  scriptElement.innerHTML =
    typeof content === "object" ? JSON.stringify(content) : content;
  document.head.appendChild(scriptElement);
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
async function parseScriptsTags(resolver: Resolver) {
  const modules: string[] = [];
  const localFiles: string[] = [];
  let packages: Record<string, string> = {};

  const tags = document.querySelectorAll("script[type=ts-module-browser]");
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const content = await getScriptContent(tag as HTMLScriptElement);

    if (content) {
      const dependencies = generateImportMap(content, resolver);
      packages = { ...packages, ...dependencies.packages };
      localFiles.push(...dependencies.localFiles);
      modules.push(transpile(content));

      // Removing source tag
      tag.remove();
    }
  }

  return { modules, packages, localFiles };
}

/** Service worker for transpiling local files */
async function startServiceWorker(swPath: string) {
  if ("serviceWorker" in navigator) {
    return navigator.serviceWorker.register(swPath);
  }

  throw new Error(
    "Cannot install service worker. So local files will not work."
  );
}

/** Getting config from <script> */
function getConfig() {
  const swPrefix = "data-tsmb-sw";
  const resolverPrefix = "data-tsmb-resolver";

  const script = document.querySelector(`[${swPrefix}]`);
  const swPath = script?.getAttribute(swPrefix);
  const resolver =
    (script?.getAttribute(resolverPrefix) as Resolver) || Resolver.local;

  return { swPath, resolver };
}

/** Parse local files */
async function parseLocalFiles(localFiles: string[], resolver: Resolver) {
  return await fetch(localSearchPath, {
    method: "POST",
    body: JSON.stringify({
      files: localFiles,
      resolver,
    }),
  }).then((res) => res.json());
}

/** Start compiling ts-module-browser */
export async function start() {
  const config = getConfig();

  if (!config.swPath) {
    throw new Error("Provide service worker path");
  }

  await startServiceWorker(config.swPath);

  const { localFiles, ...scriptsResult } = await parseScriptsTags(
    config.resolver
  );
  const localResult = await parseLocalFiles(localFiles, config.resolver);

  await injectScripts({
    modules: scriptsResult.modules,
    importmap: {
      ...scriptsResult.packages,
      ...localResult.filePaths,
      ...localResult.packages,
    },
  });
}
