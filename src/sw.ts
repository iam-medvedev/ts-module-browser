/// <reference lib="WebWorker" />
import type { PackageJson } from "type-fest";
import { parsePackageLockJson, parseYarnLockFile } from "./lockfile";
import { getSourceDependencies, transpile } from "./transpiler";
import {
  localSearchPath,
  log,
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
    } catch (e) {
      log.error(`Dependency is not found: ${path}\n`, paths);
    }
  }
}

/** Search for lockfile*/
async function getLockFile() {
  const paths = ["/yarn.lock", "/package-lock.json"];

  for (const p of paths) {
    try {
      const source = await fetch(p).then((res) => {
        if (res.status === 200) {
          return res.text();
        }
      });

      if (source) {
        return {
          source,
          type: p === paths[0] ? "yarn" : "npm",
        };
      }
    } catch (e) {
      log.error(
        `Cannot get lockfile, so latest versions of packages would be loaded`
      );
    }
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

    log.error(`An error occured while transpiling file: ${url}`);
    reject();
  });
}

/** Searchs packages in local files */
async function traverseLocalFiles({
  files: _files,
  resolver,
  result,
  origin,
  referrer,
}: {
  files: string[];
  resolver: Resolver;
  result: TraverseResult;
  origin: string;
  referrer: string;
}) {
  if (!_files || !_files.length) {
    return result;
  }

  const files = _files.filter((file) => !result.filePaths.hasOwnProperty(file));
  const cleanReferrer = referrer.replace(/\/$/, "");

  if (files.length) {
    for (const file of files) {
      const normalizedFile = normalizeFilePath(file);
      const dependencyPath = normalizedFile.includes(cleanReferrer)
        ? normalizedFile
        : `${cleanReferrer}${normalizedFile}`;
      const dep = await getDependencySource(dependencyPath);

      if (dep?.source) {
        const parsedSource = await getSourceDependencies({
          source: dep.source,
          resolver,
          root: dep.path,
        });
        result.packages = { ...result.packages, ...parsedSource.packages };
        result.filePaths = {
          ...result.filePaths,
          [referrer.endsWith("/") ? dependencyPath : file]: dep.path,
        };

        const innerFiles = parsedSource.localFiles.filter(
          (file) => !result.filePaths.hasOwnProperty(file)
        );
        if (innerFiles.length) {
          await traverseLocalFiles({
            files: [...new Set(parsedSource.localFiles)],
            resolver,
            result,
            origin,
            referrer,
          });
        }
      }
    }
  }
}

/** Getting package.json from local */
async function getLocalPackageVersions() {
  try {
    const packageJson = (await fetch("/package.json").then((res) =>
      res.json()
    )) as PackageJson;
    const lockFile = await getLockFile();

    if (packageJson && lockFile) {
      if (lockFile.type === "yarn") {
        return await parseYarnLockFile(packageJson, lockFile.source);
      } else {
        return await parsePackageLockJson(
          packageJson,
          JSON.parse(lockFile.source)
        );
      }
    }
  } catch (e) {
    log.info(
      "Could not get lockfile and package.json, so latest versions of packages would be loaded"
    );
  } finally {
    return {};
  }
}

/** Compile local dependencies on the fly */
function transpileSourcesHook(req: Request): Promise<Response> {
  return new Promise(async (resolve) => {
    const { sources, resolver } = await req.json();
    const packageVersions = (await getLocalPackageVersions()) || {};

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

      await traverseLocalFiles({
        files: localFiles.map((el) => normalizeFilePath(el)),
        resolver,
        result,
        origin: self.origin,
        referrer: req.referrer,
      });
    }

    // Set versions for packages
    result.packages = Object.keys(result.packages).reduce((res, key) => {
      if (packageVersions.hasOwnProperty(key)) {
        return {
          ...res,
          [key]: `${result.packages[key]}@${packageVersions[key]}`,
        };
      }

      return { ...res, [key]: result.packages[key] };
    }, {});

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
    // Intercepting script request (except .js)
    if (
      event.request.method?.toLowerCase() === "get" &&
      event.request.destination === "script" &&
      !url.pathname.endsWith(".js")
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
