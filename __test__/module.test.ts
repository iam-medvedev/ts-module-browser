import * as ts from "typescript";
import { start } from "../src/module";

beforeEach(() => {
  window.ts = ts;

  // Set up our document body
  document.head.innerHTML = `
    <script type="ts-module-browser" resolver="skypack">
      import * as lodash from "lodash";
      import * as React from "react";
      import * as ReactDOM from "react-dom";

      function App() {
        return <div>Hello world</div>
      }

      ReactDOM.render(<App />, document.getElementById('container'));
    </script>`;
});

describe("generate script[type=module] from script[ts-module-browser]", () => {
  it("generate right code", () => {
    start();

    const module = document.querySelector('script[type="module"]');
    expect(module).toBeInTheDocument();

    const importmap = document.querySelector('script[type="importmap"]');
    expect(importmap).toBeInTheDocument();
  });
});
