import fs from "node:fs";
const contract = JSON.parse(fs.readFileSync("contracts/openapi.json", "utf8"));
function convert(s) {
  if (s.nullable) return convert({ ...s, nullable: false }) + ".nullable()";
  if (s.$ref) {
    let value = contract;
    for (const k of s.$ref.slice(2).split("/")) value = value[k];
    return convert(value);
  }
  if (s.const !== undefined) return `z.literal(${JSON.stringify(s.const)})`;
  if (s.enum)
    return s.enum.length === 1
      ? `z.literal(${JSON.stringify(s.enum[0])})`
      : `z.union([${s.enum.map((v) => `z.literal(${JSON.stringify(v)})`).join(",")}])`;
  if (s.anyOf || s.oneOf)
    return `z.union([${(s.anyOf ?? s.oneOf).map(convert).join(",")}])`;
  if (Array.isArray(s.type))
    return `z.union([${s.type.map((type) => convert({ ...s, type })).join(",")}])`;
  switch (s.type) {
    case "object":
      return `z.object({${Object.entries(s.properties ?? {})
        .map(
          ([k, v]) =>
            JSON.stringify(k) +
            ":" +
            convert(v) +
            ((s.required ?? []).includes(k) ? "" : ".optional()"),
        )
        .join(",")}})`;
    case "array":
      return `z.array(${convert(s.items)})`;
    case "string":
      return "z.string()";
    case "number":
      return "z.number()";
    case "integer":
      return "z.number().int()";
    case "boolean":
      return "z.boolean()";
    case "null":
      return "z.null()";
    default:
      throw Error("Unsupported response schema: " + JSON.stringify(s));
  }
}
let result =
  "// Generated from contracts/openapi.json. Run pnpm api:generate after a contract change.\nimport { z } from 'zod';\nexport const responseValidators:Record<string,Record<string,z.ZodType>>={\n";
for (const [path, methods] of Object.entries(contract.paths)) {
  if (
    !path.startsWith("/v1/") ||
    ["/v1/me/export", "/v1/openapi.json"].includes(path)
  )
    continue;
  result +=
    JSON.stringify(path) +
    ":{" +
    Object.entries(methods)
      .map(
        ([method, op]) =>
          JSON.stringify(method) +
          ":" +
          convert(op.responses["200"].content["application/json"].schema),
      )
      .join(",") +
    "},\n";
}
result += "};\n";
if (process.argv.includes("--check")) {
  if (fs.readFileSync("src/core/api/response-validators.ts", "utf8") !== result)
    throw Error("VALIDATOR_DRIFT");
} else fs.writeFileSync("src/core/api/response-validators.ts", result);
