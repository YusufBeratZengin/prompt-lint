/**
 * Markdown parsing and structural analysis helpers for prompt-lint.
 */

/**
 * @typedef {Object} MarkdownLineInfo
 * @property {number} lineNumber 1-based line number
 * @property {string} raw The raw line string
 * @property {boolean} isCodeBlock Whether the line is inside a fenced code block
 * @property {boolean} isCodeFenceStart Whether this line opened a fenced code block
 * @property {boolean} isCodeFenceEnd Whether this line closed a fenced code block
 * @property {boolean} isHeading Whether the line is a markdown heading
 * @property {number} headingDepth Heading depth 1-6 (0 if not a heading)
 * @property {string} headingText Heading content text
 * @property {boolean} isTable Whether the line is part of a markdown table
 * @property {boolean} isListItem Whether the line is a list item
 * @property {string} listItemPrefix Prefix for list item (e.g. "- ", "* ", "1. ")
 * @property {string} listItemText Content of list item after prefix
 * @property {boolean} isBlockquote Whether the line is a blockquote
 */

/**
 * Parses markdown document content into structured line metadata.
 * Tracks fenced code blocks accurately.
 *
 * @param {string} content
 * @returns {MarkdownLineInfo[]}
 */
export function parseMarkdownLines(content) {
  const rawLines = content.split(/\r?\n/);
  const result = [];

  let inFencedBlock = false;
  let fenceDelimiter = null;

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const lineNumber = i + 1;
    const trimmed = raw.trim();

    // Check for code fence start/end (``` or ~~~)
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    let isCodeFenceStart = false;
    let isCodeFenceEnd = false;

    if (fenceMatch) {
      const matchDelimiter = fenceMatch[1][0];
      if (!inFencedBlock) {
        inFencedBlock = true;
        fenceDelimiter = matchDelimiter;
        isCodeFenceStart = true;
      } else if (fenceDelimiter === matchDelimiter) {
        inFencedBlock = false;
        fenceDelimiter = null;
        isCodeFenceEnd = true;
      }
    }

    const isCurrentLineCode = inFencedBlock || isCodeFenceStart || isCodeFenceEnd;

    // Headings (ATX style: #, ##, etc.)
    let isHeading = false;
    let headingDepth = 0;
    let headingText = "";

    if (!isCurrentLineCode) {
      const headingMatch = raw.match(/^(\#{1,6})\s+(.*)$/);
      if (headingMatch) {
        isHeading = true;
        headingDepth = headingMatch[1].length;
        headingText = headingMatch[2].trim();
      }
    }

    // Markdown tables
    const isTable = !isCurrentLineCode && trimmed.startsWith("|") && trimmed.endsWith("|");

    // List items
    let isListItem = false;
    let listItemPrefix = "";
    let listItemText = "";

    if (!isCurrentLineCode) {
      const listMatch = raw.match(/^(\s*(?:[-*+]|\d+\.))\s+(.*)$/);
      if (listMatch) {
        isListItem = true;
        listItemPrefix = listMatch[1].trim() + " ";
        listItemText = listMatch[2];
      }
    }

    // Blockquote
    const isBlockquote = !isCurrentLineCode && trimmed.startsWith(">");

    result.push({
      lineNumber,
      raw,
      isCodeBlock: isCurrentLineCode,
      isCodeFenceStart,
      isCodeFenceEnd,
      isHeading,
      headingDepth,
      headingText,
      isTable,
      isListItem,
      listItemPrefix,
      listItemText,
      isBlockquote
    });
  }

  return result;
}

/**
 * Extracts relative file reference candidates from inline backticks and markdown links.
 *
 * @param {string} text
 * @returns {Array<{ path: string, column: number, fullMatch: string, type: 'link' | 'backtick' }>}
 */
export function extractFileReferences(text) {
  const results = [];
  const linkRanges = [];

  // 1. Markdown links: [text](target)
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    linkRanges.push([match.index, linkRegex.lastIndex]);
    const rawTarget = match[2].trim();
    // Strip optional title e.g. "path/to/file 'title'"
    const cleanTarget = rawTarget.startsWith("<")
      ? rawTarget.slice(1, rawTarget.indexOf(">") === -1 ? undefined : rawTarget.indexOf(">"))
      : rawTarget.split(/\s+/)[0];
    results.push({
      path: cleanTarget,
      column: match.index + 1,
      fullMatch: match[0],
      type: "link"
    });
  }

  // 2. Inline code backticks: `path/to/file`
  const backtickRegex = /(?<!`)`([^`\r\n]+)`(?!`)/g;
  while ((match = backtickRegex.exec(text)) !== null) {
    const candidate = match[1].trim();
    // Avoid re-matching something already inside markdown link
    if (linkRanges.some(([start, end]) => match.index >= start && match.index < end)) continue;
    const col = match.index + 1;
    results.push({
      path: candidate,
      column: col,
      fullMatch: match[0],
      type: "backtick"
    });
  }

  return results;
}
