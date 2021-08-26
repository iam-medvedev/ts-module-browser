import { dispatchEvent, EventType } from "./events";
import {
  createScript,
  localSearchPath,
  log,
  ModuleError,
  Resolver,
  TraverseResult,
} from "./utils";

type Config = {
  serviceWorkerPath?: string;
  resolver: Resolver;
};

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
  try {
    if ("serviceWorker" in navigator) {
      return navigator.serviceWorker.register(swPath);
    }

    throw new ModuleError("Service worker is not supported");
  } catch (e) {
    throw new ModuleError(e.message);
  }
}

/** Getting config from <script type="ts-module-browser-config"> */
function getConfig(): Config {
  const initialConfig = { resolver: Resolver.local };

  try {
    const scriptConfig = document.querySelector(
      `[type="ts-module-browser-config"]`
    );
    if (scriptConfig?.textContent) {
      const config = JSON.parse(scriptConfig.textContent) as Config;

      return { ...initialConfig, ...config };
    }
  } catch (e) {}

  return initialConfig;
}

/** Transpile code with service worker */
async function buildCodeInSW(sources: string[], resolver: Resolver) {
  try {
    return (await fetch(localSearchPath, {
      method: "POST",
      body: JSON.stringify({
        sources,
        resolver,
      }),
    }).then((res) => res.json())) as TraverseResult;
  } catch (e) {
    throw new ModuleError("An error occured while building sources");
  }
}

/** Start compiling ts-module-browser */
export async function start() {
  dispatchEvent(EventType.Init);

  const config = getConfig();

  if (config.resolver === Resolver.local) {
    dispatchEvent(EventType.Error);
    throw new ModuleError(
      "Local resolver is not implemented yet. Please provide another one."
    );
  }

  try {
    if (config.serviceWorkerPath) {
      await startServiceWorker(config.serviceWorkerPath);
    } else {
      log.info(
        "Service Worker path is not set. Set the attribute script[data-tsmb-sw] or register your own Service Worker."
      );
    }

    const sources = await parseScriptsTags();
    const result = await buildCodeInSW(sources, config.resolver);

    if (result) {
      await injectScripts({
        modules: result.modules,
        importmap: {
          ...result.packages,
          ...result.filePaths,
        },
      });
    }

    dispatchEvent(EventType.Success);
  } catch (e) {
    dispatchEvent(EventType.Error, e);
  }
}
