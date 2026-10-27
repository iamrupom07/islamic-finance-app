# Dependency audit

The audit was run with `pnpm audit --prod --json` against the supplied lockfiles. Backend reported zero known advisories. Mobile reported two high-severity advisories in Expo's CLI dependency chain; the installed CLI is 58.1.15. They are not ignored or claimed fixed.

| Package/path                                                                       | Finding                                                | Release treatment                                                                                                                                     |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| expo → @expo/cli → node-forge 1.4.0 (also through @expo/code-signing-certificates) | GHSA-86w9-cpqp-85rv; upstream lists no patched version | Await a compatible upstream fix or a reviewed remediation. Do not use this toolchain to validate untrusted signing material. Re-audit before release. |
| expo → @expo/cli → zod 3.25.76                                                     | GHSA-mrhx-c7xc-m3w5; patched in 4.6.6+                 | Wait for a supported CLI update or review/test an explicit compatible remediation. Do not force a breaking Zod major merely to suppress an alert.     |

Direct application/API validation uses Zod 4.6.7. The audited paths identify CLI/tooling dependencies; this is not a blanket assertion that every use is exploitable, nor a security exemption. A release owner must review reachability, signing/build infrastructure, compatibility and remediation. The actual complete audit JSON is included in DEPENDENCY_AUDIT.json. Findings can change; rerun the audit on the intended release date.

Primary advisory references:

- https://github.com/advisories/GHSA-86w9-cpqp-85rv
- https://github.com/advisories/GHSA-mrhx-c7xc-m3w5
