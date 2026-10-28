const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const path = require("node:path");
const root = path.dirname(require.resolve("@expo/cli/package.json"));
const cliRequire = createRequire(path.join(root, "package.json"));
assert.equal(cliRequire("zod/package.json").version, "4.6.7");
assert.equal(require("node-forge/package.json").version, "1.4.2");
const { PluginSchema, DevToolsPluginOutputSchema } = require(
  path.join(root, "build/src/start/server/DevToolsPlugin.schema.js"),
);
const { createMCPDevToolsExtensionSchema } = require(
  path.join(root, "build/src/start/server/createMCPDevToolsExtensionSchema.js"),
);
const plugin = {
  packageName: "test-plugin",
  packageRoot: "/tmp/test-plugin",
  cliExtensions: {
    description: "Software test only",
    entryPoint: "index.js",
    commands: [
      {
        name: "inspect",
        title: "Inspect",
        environments: ["cli", "mcp"],
        parameters: [
          { name: "text", type: "text" },
          { name: "count", type: "number" },
          { name: "confirm", type: "confirm" },
        ],
      },
    ],
  },
};
assert(PluginSchema.safeParse(plugin).success);
assert(!PluginSchema.safeParse({ ...plugin, packageName: "" }).success);
assert(
  DevToolsPluginOutputSchema.safeParse([
    { type: "text", text: "ok", level: "info" },
  ]).success,
);
assert(
  !DevToolsPluginOutputSchema.safeParse([{ type: "image", url: "invalid" }])
    .success,
);
const schema = createMCPDevToolsExtensionSchema(plugin);
assert(
  schema.safeParse({ command: "inspect", text: "ok", count: 2, confirm: true })
    .success,
);
assert(!schema.safeParse({ command: "inspect", count: "2" }).success);
assert(!schema.safeParse({ command: "unknown" }).success);
assert(!schema.safeParse({ command: "inspect", extra: 1 }).success);
const forge = require("node-forge");
const pair = forge.pki.rsa.generateKeyPair(1024);
const md = forge.md.sha256.create();
md.update("compatibility fixture");
const signature = pair.privateKey.sign(md);
assert(pair.publicKey.verify(md.digest().bytes(), signature));
console.log(
  "Expo CLI plugin/MCP schema and RSA sign/verify compatibility checks passed. Native exports remain required.",
);
