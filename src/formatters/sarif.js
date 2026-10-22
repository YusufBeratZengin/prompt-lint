import { ruleList } from "../rules/index.js";

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
export function formatSarif(results) {
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

  for (const fileResult of results) {
    const normalizedUri = fileResult.filePath.replace(/\\/g, "/");

    for (const diag of fileResult.diagnostics) {
      sarifResults.push({
        ruleId: diag.ruleId,
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
              region: {
                startLine: diag.line || 1,
                startColumn: diag.column || 1,
                endLine: diag.endLine || diag.line || 1,
                endColumn: diag.endColumn || diag.column || 1
              }
            }
          }
        ]
      });
    }
  }

  const sarifDocument = {
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
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
