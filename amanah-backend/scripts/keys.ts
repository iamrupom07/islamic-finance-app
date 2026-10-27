import { generateKeyPairSync, randomBytes } from "node:crypto";
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 3072,
});
console.log(
  "JWT_SIGNING_PRIVATE_KEY=" +
    JSON.stringify(privateKey.export({ type: "pkcs8", format: "pem" })),
);
console.log(
  "JWT_SIGNING_PUBLIC_KEY=" +
    JSON.stringify(publicKey.export({ type: "spki", format: "pem" })),
);
for (const key of ["REFRESH_TOKEN_PEPPER", "CURSOR_SECRET"])
  console.log(`${key}=${randomBytes(48).toString("base64url")}`);
