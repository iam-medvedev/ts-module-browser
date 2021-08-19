import type { PackageJson } from "type-fest";
import YAML from "yaml";

type VersionsList = Record<string, string>;
type LockList = Record<string, { version: string }>;
type PackageLockJson = {
  dependencies: LockList;
};

function parse(packageJson: PackageJson, lockList: LockList) {
  const result: VersionsList = {};

  const deps = [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
  ];

  for (const name of deps) {
    if (lockList.hasOwnProperty(name)) {
      result[name] = lockList[name].version;
    }
  }

  return result;
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
  // TODO
  return {};
}

/** Parse yarn.lock v2 */
function parseYarnLockfileV2(packageJson: PackageJson, content: string) {
  const parsedLock = YAML.parse(content) as LockList;
  delete parsedLock.__metadata;

  const lockList = Object.keys(parsedLock).reduce((res, key) => {
    const splitKey = key.split("@npm");
    const name = splitKey[0];

    return { ...res, [name]: parsedLock[key] };
  }, {} as LockList);

  return parse(packageJson, lockList);
}
