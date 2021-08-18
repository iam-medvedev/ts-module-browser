/// <reference lib="WebWorker" />
import { localFilePrefix } from "./common";
import { generateModule, Resolver } from "./transpiler";

const sw: ServiceWorkerGlobalScope = self as any;
sw.addEventListener("install", () => {
  return true;
});

/** Search for dependency in local files */
async function getDependencySource(path: string) {
  const paths = [
    `${path}.ts`,
    `${path}.tsx`,
    `${path}/index.ts`,
    `${path}/index.tsx`,
  ];

  for (const p of paths) {
    try {
      const source = await fetch(p).then((res) => {
        if (res.status === 200) {
          return res.text();
        }
      });

      if (source) {
        return source;
      }
    } catch (e) {}
  }
}

/**
 * Listening for `/tsmb:` (localFilePrefix) scripts requests
 * It is local files prefixed by importmap
 * We want transpile it on the fly
 */
sw.addEventListener("fetch", (event) => {
  if (
    event.request.method?.toLowerCase() === "get" &&
    event.request.destination === "script"
  ) {
    const url = new URL(event.request.url);
    if (
      url.origin === sw.location.origin &&
      url.pathname.startsWith(localFilePrefix)
    ) {
      const localFilePath = url.pathname
        .replace(localFilePrefix, "")
        .replace(/^\./, "");

      const dependencyPath = `${url.origin}${localFilePath}`;

      event.respondWith(
        new Promise(async (resolve, reject) => {
          // Getting source code
          const source = await getDependencySource(dependencyPath);

          // Replacing source code with transpiled
          if (source) {
            const result = generateModule(source, Resolver.skypack);

            return resolve(
              new Response(result.module, {
                headers: {
                  "Content-Type": "application/javascript; charset=utf-8",
                },
                status: 200,
              })
            );
          }

          reject();
        })
      );
    }
  }
});
