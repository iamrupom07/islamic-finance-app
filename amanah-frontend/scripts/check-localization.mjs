import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
const translations = JSON.parse(
  fs.readFileSync("src/core/i18n/bn-extra.json", "utf8"),
);
const core = ts.createSourceFile(
  "messages.ts",
  fs.readFileSync("src/core/i18n/messages.ts", "utf8"),
  99,
  true,
);
function dictionary(node) {
  if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.initializer))
    translations[node.name.text] = node.initializer.text;
  ts.forEachChild(node, dictionary);
}
dictionary(core);
const literal = new Set();
function walk(p) {
  for (const f of fs.readdirSync(p, { withFileTypes: true })) {
    const name = path.join(p, f.name);
    if (f.isDirectory()) walk(name);
    else if (name.endsWith(".tsx")) {
      const ast = ts.createSourceFile(
        name,
        fs.readFileSync(name, "utf8"),
        99,
        true,
        4,
      );
      function visit(node) {
        if (ts.isJsxText(node)) {
          const t = node.text.replace(/\s+/g, " ").trim();
          if (t && /[a-zA-Z]/.test(t)) literal.add(t);
        }
        if (
          ts.isJsxAttribute(node) &&
          [
            "label",
            "title",
            "message",
            "placeholder",
            "accessibilityLabel",
          ].includes(node.name.getText(ast)) &&
          node.initializer &&
          ts.isStringLiteral(node.initializer)
        )
          literal.add(node.initializer.text);
        ts.forEachChild(node, visit);
      }
      visit(ast);
    }
  }
}
walk("src");
const formats = new Set([
  "YYYY-MM-DD",
  "YYYY-MM-DDTHH:mm:ssZ",
  "you@example.com",
]);
const missing = [...literal].filter(
  (text) => !formats.has(text) && !translations[text],
);
if (missing.length)
  throw Error("Missing Bangla UI messages: " + JSON.stringify(missing));
console.log(
  `Bangla translations cover ${literal.size - formats.size} static JSX labels. Publisher texts, user content, dynamic messages and device layout still require separate review.`,
);
