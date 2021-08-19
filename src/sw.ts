/// <reference lib="WebWorker" />
import { localSearchPath } from "./common";
import { generateImportMap, Resolver, transpile } from "./transpiler";

const sw: ServiceWorkerGlobalScope = self as any;
sw.addEventListener("install", () => {
  return true;
});

function normalizeFilePath(str: string) {
  return str.replace(/^\./, "");
}

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
        return { source, path: p };
      }
    } catch (e) {}
  }
}

/** Hook for transpiling local file on the fly */
function transpileHook(url: string): Promise<Response> {
  return new Promise(async (resolve, reject) => {
    // Getting source code
    const source = await fetch(url).then((res) => {
      if (res.status === 200) {
        return res.text();
      }
    });

    // Replacing source code with transpiled
    if (source) {
      const result = transpile(source);

      return resolve(
        new Response(result, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
          },
          status: 200,
        })
      );
    }

    reject();
  });
}

/** Searchs packages in local files */
async function traverseLocalFiles(files: string[], resolver: Resolver) {
  let packages: Record<string, string> = {};
  let filePaths: Record<string, string> = {};
  const localFiles: string[] = [];

  if (files.length) {
    for (const file of files) {
      const dep = await getDependencySource(
        `${self.origin}${normalizeFilePath(file)}`
      );

      if (dep?.source) {
        filePaths = { ...filePaths, [file]: dep.path };

        const parsedSource = await generateImportMap(dep.source, resolver);
        packages = { ...packages, ...parsedSource.packages };
        localFiles.push(...parsedSource.localFiles);

        if (parsedSource.localFiles.length) {
          const deepParsed = await traverseLocalFiles(
            parsedSource.localFiles,
            resolver
          );
          packages = { ...packages, ...deepParsed.packages };
          localFiles.push(...deepParsed.localFiles);
          filePaths = { ...filePaths, ...deepParsed.filePaths };
        }
      }
    }
  }

  return { packages, localFiles, filePaths };
}

/** Local dependencies */
function localSearchHook(req: Request): Promise<Response> {
  return new Promise(async (resolve) => {
    const { files, resolver } = await req.json();
    const result = await traverseLocalFiles(files, resolver);

    return resolve(
      new Response(JSON.stringify(result), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        status: 200,
      })
    );
  });
}

/**
 * Listening for requests
 */
sw.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.origin === sw.location.origin) {
    if (
      event.request.method?.toLowerCase() === "get" &&
      event.request.destination === "script" &&
      url.origin === sw.location.origin &&
      url.pathname.endsWith(".tsx")
    ) {
      event.respondWith(transpileHook(event.request.url));
    }

    if (
      event.request.method.toLowerCase() === "post" &&
      url.pathname.startsWith(localSearchPath)
    ) {
      event.respondWith(localSearchHook(event.request));
    }
  }
});
