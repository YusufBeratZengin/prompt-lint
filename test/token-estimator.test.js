import test from "node:test";
import assert from "node:assert/strict";
import { estimateTokens } from "../src/token-estimator.js";

test("token-estimator: handles empty and invalid inputs", () => {
  assert.deepEqual(estimateTokens(""), { tokens: 0, words: 0, characters: 0, lines: 0 });
  assert.deepEqual(estimateTokens(null), { tokens: 0, words: 0, characters: 0, lines: 0 });
});

test("token-estimator: estimates single words and punctuation", () => {
  const result = estimateTokens("Hello world.");
  assert.equal(result.words, 2);
  assert.ok(result.tokens >= 2 && result.tokens <= 4);
});

test("token-estimator: subword scaling on long words", () => {
  const shortResult = estimateTokens("test");
  const longResult = estimateTokens("antidisestablishmentarianism");

  assert.equal(shortResult.tokens, 1);
  assert.ok(longResult.tokens > 4);
});

test("token-estimator: handles code blocks and indentation", () => {
  const code = "```javascript\nfunction test() {\n    return 42;\n}\n```";
  const result = estimateTokens(code);

  assert.ok(result.tokens >= 10);
  assert.equal(result.lines, 5);
});

test("token-estimator: handles numbers and whitespace", () => {
  const text = "123 456 789\n\n\n    indented";
  const result = estimateTokens(text);

  assert.ok(result.tokens >= 6);
});

test("token-estimator: handles non-ASCII characters", () => {
  const trText = "Türkçe karakterler içeren bir metin: ç, ğ, ı, ö, ş, ü.";
  const result = estimateTokens(trText);

  assert.ok(result.tokens >= 8);
});
