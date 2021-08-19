/// <reference lib="WebWorker" />
import { getSourceDependencies, transpile } from "./transpiler";
import {
  localSearchPath,
  normalizeFilePath,
  Resolver,
  TraverseResult,
  whetherFileIsScript,
} from "./utils";

const sw: ServiceWorkerGlobalScope = self as any;
sw.addEventListener("install", () => {
  return true;
});

/** Search for dependency in local files */
async function getDependencySource(path: string) {
  const paths = [
    `${path}.js`,
    `${path}.ts`,
    `${path}.tsx`,
    `${path}/index.js`,
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
function transpileFileHook(url: string): Promise<Response> {
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
async function traverseLocalFiles(
  _files: string[],
  resolver: Resolver,
  result: TraverseResult
) {
  if (!_files || !_files.length) {
    return result;
  }

  const files = _files.filter((file) => !result.filePaths.hasOwnProperty(file));

  if (files.length) {
    for (const file of files) {
      const normalizedPath = normalizeFilePath(file);
      const dep = await getDependencySource(normalizedPath);

      if (dep?.source) {
        const parsedSource = await getSourceDependencies({
          source: dep.source,
          resolver,
          root: dep.path,
        });
        result.packages = { ...result.packages, ...parsedSource.packages };
        result.filePaths = { ...result.filePaths, [normalizedPath]: dep.path };

        const innerFiles = parsedSource.localFiles.filter(
          (file) => !result.filePaths.hasOwnProperty(file)
        );
        if (innerFiles.length) {
          await traverseLocalFiles(
            [...new Set(parsedSource.localFiles)],
            resolver,
            result
          );
        }
      }
    }
  }
}

/** Compile local dependencies on the fly */
function transpileSourcesHook(req: Request): Promise<Response> {
  return new Promise(async (resolve) => {
    const { sources, resolver } = await req.json();

    const result: TraverseResult = {
      packages: {},
      filePaths: {},
      modules: [],
    };

    for (const source of sources) {
      const { localFiles, packages } = await getSourceDependencies({
        source,
        resolver,
      });

      result.packages = { ...result.packages, ...packages };
      result.modules.push(transpile(source));

      await traverseLocalFiles(
        localFiles.map((el) => `${self.origin}${normalizeFilePath(el)}`),
        resolver,
        result
      );
    }

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

/** Redirect from components with trailing slash */
function redirectFromTrailingSlash(url: string): Promise<Response> {
  return new Promise(async (resolve) => {
    const dep = await getDependencySource(normalizeFilePath(url));
    const response = dep ? Response.redirect(dep.path) : Response.error();

    resolve(response);
  });
}

/**
 * Listening for requests
 */
sw.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.origin === sw.location.origin) {
    // Intercepting script request
    if (
      event.request.method?.toLowerCase() === "get" &&
      event.request.destination === "script" &&
      url.origin === sw.location.origin
    ) {
      if (whetherFileIsScript(url.pathname)) {
        // Transpile typescript on the fly
        event.respondWith(transpileFileHook(event.request.url));
      } else {
        // Redirect from components with trailing slash
        event.respondWith(redirectFromTrailingSlash(event.request.url));
      }
    }

    // Transpile source code from html
    if (
      event.request.method.toLowerCase() === "post" &&
      url.pathname.startsWith(localSearchPath)
    ) {
      event.respondWith(transpileSourcesHook(event.request));
    }
  }
});
