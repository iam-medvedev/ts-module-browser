import * as ts from "typescript";
import { start } from "../src/module";

const packages = ["lodash", "react"];
const resolver = "skypack";

const localScriptTs = "function test(): void { console.log('test') }";
const localScriptJs = "function test() { console.log('test'); }";

beforeEach(() => {
  window.ts = ts;

  // Set up our document body
  document.head.innerHTML = `
    <script type="ts-module-browser" resolver="${resolver}">
      ${packages.map((el) => `import * as ${el} from "${el}";`).join("\n")}

      function App() {
        return <div>Hello world</div>
      }

      ReactDOM.render(<App />, document.getElementById('container'));
    </script>
    <script type="ts-module-browser" src="./local-script.ts"></script>
    `;
});

describe("generate script[type=module] from script[ts-module-browser]", () => {
  it("create scripts", async () => {
    fetchMock.mockOnce(localScriptTs);
    await start();

    const importmap = document.querySelector('script[type="importmap"]');
    expect(importmap).toBeInTheDocument();

    const importmapContent = importmap?.textContent
      ? JSON.parse(importmap.textContent)
      : {};
    expect(importmapContent).toMatchObject({
      imports: packages.reduce(
        (obj, pkg) => ({ ...obj, [pkg]: `https://cdn.skypack.dev/${pkg}` }),
        {}
      ),
    });

    const modules = document.querySelectorAll('script[type="module"]');
    expect(modules.item(0)).toBeInTheDocument();
    expect(modules.item(1)).toBeInTheDocument();

    expect(modules.item(1).textContent).toEqual(
      expect.stringContaining(localScriptJs)
    );
  });
});
