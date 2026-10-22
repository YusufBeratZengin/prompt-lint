import { formatStylish } from "./stylish.js";
import { formatJson } from "./json.js";
import { formatSarif } from "./sarif.js";

export const formatters = {
  stylish: formatStylish,
  json: formatJson,
  sarif: formatSarif
};

/**
 * Gets a formatter by name. Defaults to 'stylish'.
 *
 * @param {string} [name='stylish']
 * @returns {Function}
 */
export function getFormatter(name = "stylish") {
  const normalized = String(name).toLowerCase();
  return formatters[normalized] || formatters.stylish;
}

export { formatStylish, formatJson, formatSarif };
