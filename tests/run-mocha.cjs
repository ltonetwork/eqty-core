#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const Mocha = require("mocha");
const { register } = require("ts-node");

register({
  project: path.resolve(__dirname, "../tsconfig.test.json"),
  transpileOnly: true,
  compilerOptions: { module: "CommonJS" },
  moduleTypes: {
    "**/*.ts": "cjs",
  },
});

const mocha = new Mocha({
  timeout: 10000,
});

const specDirectories = [
  path.resolve(__dirname, "../test"),
  path.resolve(__dirname, "../tests"),
];

const files = [];

for (const dir of specDirectories) {
  if (!fs.existsSync(dir)) continue;

  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const stats = fs.statSync(current);
    if (stats.isDirectory()) {
      for (const entry of fs.readdirSync(current)) {
        stack.push(path.join(current, entry));
      }
    } else if (stats.isFile() && current.endsWith(".spec.ts")) {
      files.push(current);
    }
  }
}

files.sort();

files.forEach((file) => mocha.addFile(file));

mocha.run((failures) => {
  process.exitCode = failures ? 1 : 0;
});
