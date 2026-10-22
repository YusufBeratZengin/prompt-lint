/**
 * Stylish console formatter with ANSI colors and NO_COLOR support.
 * Zero external dependencies.
 */

const isColorSupported = () => {
  if (process.env.NO_COLOR != null || process.argv.includes("--no-color")) {
    return false;
  }
  if (process.env.FORCE_COLOR != null) {
    return true;
  }
  return Boolean(process.stdout?.isTTY);
};

const colors = {
  reset: (text) => `\x1b[0m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[22m`,
  dim: (text) => `\x1b[2m${text}\x1b[22m`,
  underline: (text) => `\x1b[4m${text}\x1b[24m`,
  red: (text) => `\x1b[31m${text}\x1b[39m`,
  yellow: (text) => `\x1b[33m${text}\x1b[39m`,
  blue: (text) => `\x1b[34m${text}\x1b[39m`,
  cyan: (text) => `\x1b[36m${text}\x1b[39m`,
  green: (text) => `\x1b[32m${text}\x1b[39m`,
  gray: (text) => `\x1b[90m${text}\x1b[39m`
};

const noColor = {
  reset: (text) => text,
  bold: (text) => text,
  dim: (text) => text,
  underline: (text) => text,
  red: (text) => text,
  yellow: (text) => text,
  blue: (text) => text,
  cyan: (text) => text,
  green: (text) => text,
  gray: (text) => text
};

/**
 * Formats lint results into stylish console output.
 *
 * @param {Array<{ filePath: string, diagnostics: Array<any>, tokenStats?: any }>} results
 * @param {Object} [options]
 * @param {boolean} [options.color]
 * @returns {string}
 */
export function formatStylish(results, options = {}) {
  const useColor = options.color ?? isColorSupported();
  const c = useColor ? colors : noColor;

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalFiles = 0;
  const outputBlocks = [];

  for (const fileResult of results) {
    const { filePath, diagnostics, tokenStats } = fileResult;
    totalFiles++;

    if (!diagnostics || diagnostics.length === 0) {
      continue;
    }

    const lines = [];
    const headerPath = c.underline(c.bold(filePath));
    const tokenInfo = tokenStats ? c.dim(` (~${tokenStats.tokens.toLocaleString()} tokens, ${tokenStats.words.toLocaleString()} words)`) : "";
    lines.push(`\n${headerPath}${tokenInfo}`);

    // Compute column widths for alignment
    let maxPosLen = 0;
    for (const d of diagnostics) {
      const pos = `${d.line || 1}:${d.column || 1}`;
      if (pos.length > maxPosLen) {
        maxPosLen = pos.length;
      }
    }

    for (const diag of diagnostics) {
      if (diag.severity === "error") totalErrors++;
      else if (diag.severity === "warning") totalWarnings++;

      const pos = `${diag.line || 1}:${diag.column || 1}`.padEnd(maxPosLen);
      const posStr = c.dim(pos);

      let severityStr = diag.severity;
      if (diag.severity === "error") {
        severityStr = c.red("error  ");
      } else if (diag.severity === "warning") {
        severityStr = c.yellow("warning");
      } else {
        severityStr = c.cyan("info   ");
      }

      const messageStr = diag.message;
      const ruleStr = c.dim(diag.ruleId);

      lines.push(`  ${posStr}  ${severityStr}  ${messageStr}  ${ruleStr}`);
    }

    outputBlocks.push(lines.join("\n"));
  }

  const totalProblems = totalErrors + totalWarnings;
  let summary = "";

  if (totalProblems > 0) {
    const problemWord = totalProblems === 1 ? "problem" : "problems";
    const errorWord = totalErrors === 1 ? "error" : "errors";
    const warningWord = totalWarnings === 1 ? "warning" : "warnings";

    const symbol = totalErrors > 0 ? c.red("✖") : c.yellow("!");
    const summaryColor = totalErrors > 0 ? c.red : c.yellow;

    summary = `\n${symbol} ${summaryColor(c.bold(`${totalProblems} ${problemWord} (${totalErrors} ${errorWord}, ${totalWarnings} ${warningWord})`))}\n`;
  } else {
    summary = `\n${c.green("✔")} ${c.green("No problems found.")}\n`;
  }

  return (outputBlocks.length > 0 ? outputBlocks.join("\n") + "\n" : "") + summary;
}

export default formatStylish;
