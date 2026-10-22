#!/usr/bin/env node

import { runCli } from "../src/cli.js";

runCli().then((code) => {
  process.exit(code);
}).catch((err) => {
  process.stderr.write(`Fatal prompt-lint error: ${err?.stack || err}\n`);
  process.exit(2);
});
