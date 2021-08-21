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
  Run typescript in browser with <code>script[type="ts-module-browser"]</code> without bundler
</div>

## Run examples

You can see the [source](./examples) code of the examples, or [see it in action](https://iam-medvedev.github.io/ts-module-browser/examples).

- React from CDN ([source](http://github.com/iam-medvedev/ts-module-browser/examples/react-cdn), [live](https://iam-medvedev.github.io/ts-module-browser/examples/react-cdn), [codesandbox](https://githubbox.com/iam-medvedev/ts-module-browser/tree/master/examples/react-cdn))
- React + Styled Components from CDN ([source](http://github.com/iam-medvedev/ts-module-browser/examples/react-styled-cdn), [live](https://iam-medvedev.github.io/ts-module-browser/examples/react-styled-cdn), [codesandbox](https://githubbox.com/iam-medvedev/ts-module-browser/tree/master/examples/react-styled-cdn))

Also you can run the examples locally using the command:
```bash
$ yarn examples
```

## Features

- Transpiling typescript code from `script[type="ts-module-browser"]` through Service Worker
- Ability to resolve packages through [CDN](#available-package-resolvers)
- Loading local typescript files

## Usage

The code in the browser is transpiled using a Service Worker. Due to Service Worker does not work in another origin (another domain, protocol or CDN), you need to install it locally:

`/sw.js`
```javascript
// Load typescript (you can use any version you want)
self.importScripts("https://cdn.jsdelivr.net/npm/typescript@latest/lib/typescriptServices.js");

// Load sw code from CDN
self.importScripts("https://cdn.jsdelivr.net/npm/ts-module-browser@latest/dist/sw.js");
```

`/index.html`:
```html
<div id="container"></div>

<!-- Load ts-module-browser and provide path to your local sw.js file -->
<script src="https://cdn.jsdelivr.net/npm/ts-module-browser@latest" data-tsmb-sw="/sw.js" data-tsmb-resolver="skypack"></script>

<!-- Write your code -->
<script type="ts-module-browser">
  import * as lodash from "lodash";
  import * as React from "react";
  import * as ReactDOM from "react-dom";
  import { Button } from "./some-local-component";

  function App() {
    return <Button>Hello world</Button>
  }

  ReactDOM.render(<App />, document.getElementById('container'));
</script>
```

### Local usage
```bash
yarn install ts-module-browser -D
```

`/index.html`:
```html
<!-- Provide path to ts-module-browser location -->
<script src="node_modules/ts-module-browser/dist/module.js" data-tsmb-sw="node_modules/ts-module-browser/dist/sw.js" data-tsmb-resolver="local"></script>
```

### Available package resolvers
All packages can be resolved using the following providers:

- [skypack](https://skypack.dev/)
- [jspm](https://jspm.dev)
- local (`/node_modules`) (not implemented yet).

## Work In Progress
Please don't use `ts-module-browser` in production.

- [x] Compile typescript in browser
- [x] Load packages from CDN
- [x] Compile local files
- [x] Compile from `script[src]`
- [x] Load packages from local files
- [ ] Load packages from `/node_modules`
- [ ] Parse versions from package.json and lock
  - [x] package-lock.json
  - [x] yarn.lock v1
  - [x] yarn.lock v2
  - [ ] parse protocols


## License

`ts-module-browser` is [MIT licensed](./LICENSE).
