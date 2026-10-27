import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
const strings = new Set();
function walk(node) {
  if (!node || typeof node !== "object") return;
  if (node.type === "JSXText") {
    const s = node.value.replace(/\s+/g, " ").trim();
    if (s) strings.add(s);
  }
  if (
    node.type === "JSXAttribute" &&
    ["label", "title", "message", "placeholder"].includes(node.name?.name) &&
    node.value?.type === "StringLiteral"
  )
    strings.add(node.value.value);
  for (const value of Object.values(node))
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") walk(value);
}
function files(dir) {
  for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, file.name);
    if (file.isDirectory()) files(p);
    else if (p.endsWith(".tsx"))
      walk(
        parse(fs.readFileSync(p, "utf8"), {
          sourceType: "module",
          plugins: ["typescript", "jsx"],
        }),
      );
  }
}
files("src");
fs.writeFileSync(
  "src/core/i18n/ui-copy.json",
  JSON.stringify([...strings].sort(), null, 2) + "\n",
);
