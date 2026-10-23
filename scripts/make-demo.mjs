import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { runCli } from "../src/cli.js";

// Invoke the same CLI entry point as bin/prompt-lint.js and capture its real output.
// Keep these arguments in sync with the terminal example in both READMEs.
const args = ["--no-color", "test/fixtures/dirty/bloated.md"];
const command = `$ node bin/prompt-lint.js ${args.join(" ")}`;
const root = new URL("../", import.meta.url);
process.chdir(fileURLToPath(root));

let stdout = "";
let stderr = "";
const status = await runCli(args, {
  stdout: { write: value => { stdout += value; return true; } },
  stderr: { write: value => { stderr += value; return true; } }
});
if (status !== 1 || stderr) {
  throw new Error(`Expected the demo fixture to produce lint errors (exit 1), got ${status}. ${stderr}`);
}

// Wrap for display only: retain every diagnostic, its wording, and the summary.
const columns = 144;
function wrap(line) {
  const parts = [];
  let remaining = line;
  while (remaining.length > columns) {
    const split = remaining.lastIndexOf(" ", columns);
    const end = split > 0 ? split : columns;
    parts.push(remaining.slice(0, end));
    remaining = `    ${remaining.slice(end).trimStart()}`;
  }
  parts.push(remaining);
  return parts;
}
const lines = [command, ...stdout.trimEnd().split(/\r?\n/)].flatMap(wrap);
const summary = stdout.trimEnd().split(/\r?\n/).at(-1).replace(/^✖\s*/, "");
const escape = value => value.replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
})[char]);
const width = 1280;
const lineHeight = 23;
const height = 90 + lines.length * lineHeight;
const rows = lines.map((line, index) => {
  const color = index === 0 ? "#a6e3a1"
    : /(?:\berror\b|^✖)/.test(line) ? "#f38ba8"
      : /\bwarning\b/.test(line) ? "#f9e2af" : "#cdd6f4";
  return `    <text x="24" y="${78 + index * lineHeight}" fill="${color}">${escape(line)}</text>`;
}).join("\n");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">
  <title id="title">prompt-lint terminal demo</title>
  <desc id="description">Real CLI output from the intentionally flawed fixture: ${escape(summary)}. Long lines wrap for readability.</desc>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="14" fill="#1e1e2e" stroke="#45475a"/>
  <path d="M15 1H1265Q1279 1 1279 15V46H1V15Q1 1 15 1Z" fill="#313244"/>
  <circle cx="25" cy="24" r="6" fill="#f38ba8"/>
  <circle cx="47" cy="24" r="6" fill="#f9e2af"/>
  <circle cx="69" cy="24" r="6" fill="#a6e3a1"/>
  <text x="640" y="29" text-anchor="middle" fill="#cdd6f4" font-family="monospace" font-size="13">prompt-lint · offline prompt analysis</text>
  <g font-family="Consolas, 'Liberation Mono', monospace" font-size="14" xml:space="preserve">
${rows}
  </g>
</svg>
`;

const output = new URL("docs/demo.svg", root);
if (process.argv.includes("--check")) {
  const existing = await readFile(output, "utf8");
  if (existing !== svg) {
    console.error("docs/demo.svg is stale. Run npm run demo.");
    process.exitCode = 1;
  } else {
    console.log("docs/demo.svg matches current CLI output.");
  }
} else {
  await mkdir(new URL("docs/", root), { recursive: true });
  await writeFile(output, svg);
  console.log(`Generated docs/demo.svg (${lines.length} terminal lines, CLI exit ${status}).`);
}
