import {
  createScript,
  localSearchPath,
  Resolver,
  TraverseResult,
} from "./utils";

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

/** Get inline script content or load from src */
async function getScriptContent(tag: HTMLScriptElement) {
  const src = tag.getAttribute("src");

  if (src) {
    const content = await fetch(src).then((res) => res.text());
    return content;
  }

  return tag.textContent;
}

/** Parse source code from scripts[ts-module-browser] */
async function parseScriptsTags() {
  const sources: string[] = [];

  const tags = document.querySelectorAll("script[type=ts-module-browser]");
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const source = await getScriptContent(tag as HTMLScriptElement);

    if (source) {
      sources.push(source);

      // Removing source tag
      tag.remove();
    }
  }

  return sources;
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

/** Transpile code with service worker */
async function buildCodeInSW(sources: string[], resolver: Resolver) {
  return (await fetch(localSearchPath, {
    method: "POST",
    body: JSON.stringify({
      sources,
      resolver,
    }),
  }).then((res) => res.json())) as TraverseResult;
}

/** Start compiling ts-module-browser */
export async function start() {
  const config = getConfig();

  if (!config.swPath) {
    throw new Error("Provide service worker path");
  }

  if (config.resolver === Resolver.local) {
    throw new Error(
      "Local resolver is not implemented yet. Please provide another one."
    );
  }

  await startServiceWorker(config.swPath);
  const sources = await parseScriptsTags();
  const result = await buildCodeInSW(sources, config.resolver);

  await injectScripts({
    modules: result.modules,
    importmap: {
      ...result.packages,
      ...result.filePaths,
    },
  });
}
