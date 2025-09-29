import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const Mocha = require("mocha");

function collectSpecFiles(dir) {
  const collected = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collected.push(...collectSpecFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".spec.ts")) {
      collected.push(path.resolve(entryPath));
    }
  }
  return collected;
}

const mocha = new Mocha({ reporter: "spec", timeout: 10000 });
const files = collectSpecFiles("tests");

for (const file of files) {
  mocha.addFile(file);
}

await mocha.loadFilesAsync();

mocha.run((failures) => {
  process.exitCode = failures ? 1 : 0;
});
