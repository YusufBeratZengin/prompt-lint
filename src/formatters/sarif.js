import { ruleList } from "../rules/index.js";
import { isAbsolute, relative, resolve, sep, win32 } from "node:path";
import { pathToFileURL } from "node:url";

const isWindowsPath = path => /^[A-Za-z]:[\\/]/.test(path) || /^[\\/]{2}[^\\/]/.test(path);

function sourceRootUri(cwd) {
  if (isWindowsPath(cwd)) {
    const path = win32.resolve(cwd).replace(/\\/g, "/");
    const encoded = path.split("/").map((part, index) =>
      index === 0 && /^[A-Za-z]:$/.test(part) ? part : encodeURIComponent(part)
    ).join("/").replace(/\/?$/, "/");
    return `${path.startsWith("//") ? "file:" : "file:///"}${encoded}`;
  }
  return pathToFileURL(resolve(cwd) + sep).href;
}

function sourceUri(filePath, cwd) {
  let path = filePath;
  if (isWindowsPath(path)) {
    path = win32.relative(cwd, path);
  } else if (isAbsolute(path)) {
    path = relative(cwd, path);
  }
  return path.replace(/\\/g, "/").replace(/^\.\//, "").split("/").map(encodeURIComponent).join("/");
}

/**
 * Maps prompt-lint severity to SARIF level ("error", "warning", "note", "none").
 *
 * @param {string} severity
 * @returns {"error" | "warning" | "note" | "none"}
 */
function toSarifLevel(severity) {
  switch (severity) {
    case "error":
      return "error";
    case "warning":
      return "warning";
    case "info":
      return "note";
    default:
      return "none";
  }
}

/**
 * Formats lint results into OASIS SARIF v2.1.0 JSON format for GitHub Code Scanning.
 *
 * @param {Array<{ filePath: string, diagnostics: Array<any> }>} results
 * @returns {string}
 */
export function formatSarif(results, { cwd = process.cwd() } = {}) {
  const sarifRules = ruleList.map(rule => ({
    id: rule.meta.id,
    name: rule.meta.name,
    shortDescription: {
      text: rule.meta.description
    },
    defaultConfiguration: {
      level: toSarifLevel(rule.meta.defaultSeverity)
    },
    helpUri: rule.meta.docsUrl,
    properties: {
      category: rule.meta.category,
      recommended: rule.meta.recommended
    }
  }));

  const sarifResults = [];
  const indices = new Map(sarifRules.map((rule, index) => [rule.id, index]));

  for (const fileResult of results) {
    const normalizedUri = sourceUri(fileResult.filePath, cwd);

    for (const diag of fileResult.diagnostics) {
      if (!indices.has(diag.ruleId)) {
        indices.set(diag.ruleId, sarifRules.length);
        sarifRules.push({ id: diag.ruleId, shortDescription: { text: "File or analysis error" } });
      }
      const region = { startLine: diag.line || 1, startColumn: diag.column || 1 };
      const endLine = diag.endLine || region.startLine;
      const endColumn = diag.endColumn || region.startColumn;
      if (endLine > region.startLine || (endLine === region.startLine && endColumn > region.startColumn)) {
        region.endLine = endLine;
        region.endColumn = endColumn;
      }
      sarifResults.push({
        ruleId: diag.ruleId,
        ruleIndex: indices.get(diag.ruleId),
        level: toSarifLevel(diag.severity),
        message: {
          text: diag.message
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: normalizedUri,
                uriBaseId: "%SRCROOT%"
              },
              region
            }
          }
        ]
      });
    }
  }

  const sarifDocument = {
    $schema: "https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/schemas/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        columnKind: "utf16CodeUnits",
        originalUriBaseIds: {
          "%SRCROOT%": { uri: sourceRootUri(cwd) }
        },
        tool: {
          driver: {
            name: "prompt-lint",
            version: "0.1.0",
            informationUri: "https://github.com/YusufBeratZengin/prompt-lint",
            rules: sarifRules
          }
        },
        results: sarifResults
      }
    ]
  };

  return JSON.stringify(sarifDocument, null, 2);
}

export default formatSarif;
