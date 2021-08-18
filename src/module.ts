import { localFilePrefix } from "./common";
import { generateModule, Resolver } from "./transpiler";

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
async function importScriptsTags() {
  const modules: string[] = [];
  let importmaps: Record<string, string> = {
    // Local files mapping
    "/": `${localFilePrefix}/`,
  };

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

/** Service worker for transpiling local files */
async function startServiceWorker() {
  if ("serviceWorker" in navigator) {
    // Getting service worker path
    const prefix = "data-tsmb-sw";
    const script = document.querySelector(`[${prefix}]`);
    const swPath = script?.getAttribute(prefix) || "/sw.js";

    return navigator.serviceWorker.register(swPath);
  }

  throw new Error(
    "Cannot install service worker. So local files will not work."
  );
}

/** Start compiling ts-module-browser */
export async function start() {
  await startServiceWorker();
  await importScriptsTags();
}
