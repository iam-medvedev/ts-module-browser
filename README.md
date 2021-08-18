<h1 align="center">
  ts-module-browser <sup>[beta]</sup>
</h1>

<div align="center">
  <a href="http://www.typescriptlang.org/"><img src="https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg" alt="TypeScript" /></a>
  <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/code_style-prettier-f8bc45.svg" alt="code style: prettier" /></a>
  <a href="https://www.npmjs.com/package/ts-module-browser"><img src="https://badge.fury.io/js/ts-module-browser.svg" alt="npm version" /></a>
  <a href="https://david-dm.org/iam-medvedev/ts-module-browser"><img src="https://status.david-dm.org/gh/iam-medvedev/ts-module-browser.svg" alt="David" /></a>
  <a href="https://david-dm.org/iam-medvedev/ts-module-browser"><img src="https://status.david-dm.org/gh/iam-medvedev/ts-module-browser.svg?type=dev" alt="David" /></a>
  <a href="https://github.com/semantic-release/semantic-release"><img src="https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg" alt="semantic-release" /></a>
</div>

<div align="center">
  Run typescript in browser with <code>script[type="ts-module-browser"]</code>.
</div>

## Usage

`ts-module-browser` will transpile code from `script[type="ts-module-browser"]` and load packages from CDN.

```html
<div id="container"></div>

<!-- Load ts-module-browser -->
<script src="https://unpkg.com/ts-module-browser@latest"></script>

<!--
  Write your code
  All packages will be loaded from the provided resolver (skypack | jspm)
-->
<script type="ts-module-browser" resolver="skypack">
  import * as lodash from "lodash";
  import * as React from "react";
  import * as ReactDOM from "react-dom";

  function App() {
    return <Button>Hello world</Button>
  }

  ReactDOM.render(<App />, document.getElementById('container'));
</script>
```

### Transpile local files

If you want to use local files in your code, you need to install a Service Worker. Due to SW does not work in another origin (another domain, protocol or CDN), you need to install it locally.

`/sw.js`
```javascript
// Load sw code from CDN
self.importScripts("https://unpkg.com/ts-module-browser@latest/dist/sw.js");
```


`/index.html`:
```html
<!-- Provide path to your sw.js file -->
<script src="module.js" data-tsmb-sw="/sw.js"></script>
```

### Available package resolvers
All packages can be resolved using the following CDN providers:

- [skypack](https://skypack.dev/)
- [jspm](https://jspm.dev)

Or via local `/node_modules` (not implemented yet).

## Run example
```bash
$ yarn example
```

## Work In Progress
Please don't use `ts-module-browser` in production.

- [x] Compile typescript in browser
- [x] Load packages from CDN
- [x] Compile local files
- [x] Compile from `script[src]`
- [] Load packages from local files
- [] Load packages from `/node_modules`

## License

`ts-module-browser` is [MIT licensed](./LICENSE).
