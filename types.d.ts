declare module "parse-es6-imports" {
  type NamedImport = {
    name: string;
    value: string;
  };

  type ParsedImport = {
    defaultImport: string | null;
    namedImports: NamedImport[];
    starImport: string | null;
    fromModule: string;
  };
  export default function (code: string): ParsedImport[];
}

interface Window {
  ts: typeof import("typescript");
}
