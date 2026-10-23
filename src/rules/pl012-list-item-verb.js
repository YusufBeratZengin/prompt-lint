import { stripMarkdownFormatting } from "../utils/text.js";

/**
 * Rule PL012: List items without verbs (optional, off by default)
 */

const ACTION_VERBS = new Set([
  "add", "alert", "allow", "analyze", "append", "apply", "ask", "assert",
  "assign", "attach", "audit", "avoid", "backup", "batch", "bind", "block",
  "branch", "broadcast", "build", "cache", "calculate", "call", "cancel",
  "capture", "check", "clean", "cleanup", "clear", "clone", "close", "collect",
  "combine", "commit", "compare", "compile", "complete", "compose", "compute",
  "configure", "confirm", "connect", "consume", "contain", "convert", "copy",
  "correct", "count", "create", "debug", "declare", "decode", "decrypt",
  "default", "define", "delay", "delete", "deliver", "deploy", "derive",
  "describe", "destroy", "detach", "detect", "determine", "disable", "discard",
  "disconnect", "dispatch", "display", "dispose", "distribute", "divide", "do",
  "document", "download", "drain", "drop", "dump", "duplicate", "echo", "edit",
  "emit", "empty", "enable", "encapsulate", "enclose", "encode", "encrypt",
  "enforce", "ensure", "enter", "enumerate", "erase", "escalate", "estimate",
  "evaluate", "examine", "exclude", "execute", "exit", "expand", "expect",
  "expire", "explain", "export", "expose", "extend", "extract", "fail", "fallback",
  "fetch", "filter", "finalize", "find", "finish", "fix", "flush", "focus",
  "force", "format", "forward", "free", "freeze", "fulfill", "generate", "get",
  "give", "grab", "grant", "group", "guard", "halt", "handle", "hash", "hide",
  "highlight", "hold", "hook", "identify", "ignore", "implement", "import",
  "include", "increment", "index", "init", "initialize", "inject", "input",
  "insert", "inspect", "install", "instruct", "integrate", "intercept", "interpolate",
  "interpret", "interrupt", "invalidate", "invoke", "isolate", "iterate", "join",
  "keep", "kill", "label", "launch", "limit", "link", "lint", "listen", "load",
  "locate", "lock", "log", "maintain", "make", "manage", "map", "mask", "match",
  "measure", "merge", "migrate", "minimize", "mirror", "mock", "modify", "monitor",
  "mount", "move", "mutate", "name", "navigate", "negate", "neutralize", "normalize",
  "notify", "nullify", "observe", "obtain", "omit", "open", "operate", "optimize",
  "order", "organize", "output", "override", "package", "paginate", "panic", "parse",
  "pass", "patch", "pause", "perform", "persist", "pin", "ping", "pipe", "poll",
  "populate", "post", "prefix", "prepend", "prepare", "prepend", "preserve", "prevent",
  "print", "prioritize", "probe", "proceed", "process", "produce", "profile", "prohibit",
  "project", "prompt", "propagate", "protect", "provide", "prune", "publish", "pull",
  "purge", "push", "put", "query", "queue", "quit", "raise", "read", "rebuild",
  "receive", "reclaim", "recognize", "record", "recover", "recruit", "redact",
  "redirect", "reduce", "refactor", "reference", "refine", "refresh", "register",
  "reject", "release", "reload", "remap", "remove", "rename", "render", "renew",
  "reopen", "reorder", "repair", "replace", "replicate", "reply", "report",
  "request", "require", "reschedule", "reset", "resolve", "restart", "restore",
  "restrict", "resume", "retain", "retry", "return", "reverse", "revert", "review",
  "revoke", "rewrite", "roll", "rollback", "rotate", "route", "run", "sanitize",
  "save", "scale", "scan", "schedule", "scope", "screen", "scrub", "seal", "search",
  "secure", "seed", "select", "send", "separate", "serialize", "serve", "set",
  "setup", "share", "shift", "show", "shrink", "shutdown", "sign", "signal",
  "simulate", "skip", "sleep", "slice", "snapshot", "sort", "spawn", "specify",
  "spin", "split", "squash", "stage", "stall", "start", "stash", "step", "stop",
  "store", "stream", "strip", "submit", "subscribe", "substitute", "subtract",
  "sum", "swap", "switch", "sync", "synthesize", "tag", "tail", "take", "tally",
  "tap", "target", "task", "teardown", "terminate", "test", "throttle", "throw",
  "tick", "time", "toggle", "trace", "track", "transfer", "transform", "translate",
  "transmit", "traverse", "trigger", "trim", "truncate", "tune", "unbind", "unblock",
  "unhook", "uninstall", "unlink", "unlock", "unmount", "unpack", "unpin", "unregister",
  "unset", "subscribe", "unsubscribe", "untag", "unwatch", "unwrap", "update",
  "upgrade", "upload", "use", "validate", "verify", "view", "wait", "wake", "warn",
  "watch", "wipe", "withdraw", "wrap", "write", "yield"
]);

const LEADING_MODIFIERS = new Set(["always", "never", "strictly", "only", "must", "do", "don't"]);

export default {
  meta: {
    id: "PL012",
    name: "list-item-verb",
    description: "List item directive does not begin with an action verb",
    category: "style",
    defaultSeverity: "off",
    recommended: false,
    docsUrl: "https://github.com/YusufBeratZengin/prompt-lint/blob/main/docs/rules.md#pl012"
  },

  run(context) {
    const diagnostics = [];

    for (const lineInfo of context.lines) {
      if (!lineInfo.isListItem || lineInfo.isCodeBlock || !lineInfo.listItemText.trim()) {
        continue;
      }

      const cleanItem = stripMarkdownFormatting(lineInfo.listItemText).trim();
      const words = cleanItem.split(/\s+/).map(w => w.replace(/[^\p{L}]/gu, "").toLowerCase()).filter(Boolean);

      if (words.length === 0) {
        continue;
      }

      let targetWord = words[0];
      if (LEADING_MODIFIERS.has(targetWord) && words.length > 1) {
        targetWord = words[1];
      }

      if (!ACTION_VERBS.has(targetWord)) {
        const preview = cleanItem.length > 40 ? `${cleanItem.slice(0, 37)}...` : cleanItem;
        diagnostics.push({
          ruleId: "PL012",
          severity: context.severity || "warning",
          message: `List item directive does not start with an action verb: "${preview}". Frame list directives with imperative verbs.`,
          line: lineInfo.lineNumber,
          column: 1,
          endLine: lineInfo.lineNumber,
          endColumn: lineInfo.raw.length + 1,
          snippet: lineInfo.raw
        });
      }
    }

    return diagnostics;
  }
};
