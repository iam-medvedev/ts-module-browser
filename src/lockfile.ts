import type { PackageJson } from "type-fest";
import YAML from "yaml";

// TODO: parse protocols in lockfiles

type VersionsList = Record<string, string>;
type LockList = Record<string, { version: string }>;
type PackageLockJson = {
  dependencies: LockList;
};

const yarnV1Tokens = {
  comment: "#",
  indent: "  ",
  multipleNames: ", ",
  version: "version ",
};

function parse(packageJson: PackageJson, lockList: LockList) {
  if (!Object.keys(lockList).length) {
    return {};
  }

  const deps = [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
  ];

  if (!deps.length) {
    return {};
  }

  const result: VersionsList = {};
  for (const name of deps) {
    if (lockList.hasOwnProperty(name)) {
      result[name] = lockList[name].version;
    }
  }

  return result;
}

function normalizePackageName(str: string) {
  return str.replace(/['"]+/g, "").split(/(?!^|.$)[@]/i)[0];
}

function normalizeYarnVersion(str: string) {
  const versionSplit = str.split(yarnV1Tokens.version);
  if (versionSplit[1]) {
    return versionSplit[1].replace(/['"]+/g, "");
  }

  return null;
}

/** Detect yarn.lock version and parse */
export function parseYarnLockFile(packageJson: PackageJson, content: string) {
  if (content.includes("__metadata")) {
    return parseYarnLockfileV2(packageJson, content);
  } else {
    return parseYarnLockfileV1(packageJson, content);
  }
}

/** Parser for package-lock.json */
export function parsePackageLockJson(
  packageJson: PackageJson,
  lock: PackageLockJson
) {
  if (lock?.dependencies) {
    return parse(packageJson, lock.dependencies);
  }

  return {};
}

/** Parse yarn.lock v1 */
function parseYarnLockfileV1(packageJson: PackageJson, content: string) {
  const lines = content.split("\n");
  const lockList: LockList = {};

  let lastName: string | null = null;
  for (const line of lines) {
    if (line.length && !line.startsWith(yarnV1Tokens.comment)) {
      if (!line.startsWith(yarnV1Tokens.indent) && !lastName) {
        lastName = line;
      } else if (
        line.startsWith(yarnV1Tokens.indent) &&
        lastName &&
        line.includes(yarnV1Tokens.version)
      ) {
        const parsedNames = lastName
          .split(yarnV1Tokens.multipleNames)
          .map(normalizePackageName);

        for (const name of [...new Set(parsedNames)]) {
          const version = normalizeYarnVersion(line);
          if (version) {
            lockList[name] = { version };
          }
        }

        lastName = null;
      }
    }
  }

  return parse(packageJson, lockList);
}

/** Parse yarn.lock v2 */
function parseYarnLockfileV2(packageJson: PackageJson, content: string) {
  const parsedLock = YAML.parse(content) as LockList;
  delete parsedLock.__metadata;

  const lockList = Object.keys(parsedLock).reduce((res, key) => {
    return { ...res, [normalizePackageName(key)]: parsedLock[key] };
  }, {} as LockList);

  return parse(packageJson, lockList);
}
