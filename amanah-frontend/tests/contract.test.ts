import contract from "../contracts/openapi.json";
import { responseValidators } from "../src/core/api/response-validators";
it("has a runtime validator for every JSON application endpoint", () => {
  for (const [path, methods] of Object.entries(contract.paths)) {
    if (
      !path.startsWith("/v1/") ||
      ["/v1/openapi.json", "/v1/me/export"].includes(path)
    )
      continue;
    for (const method of Object.keys(methods))
      expect(responseValidators[path]?.[method]).toBeDefined();
  }
});
it("rejects a malformed money response", () => {
  expect(
    responseValidators["/v1/home"]!.get!.safeParse({
      data: { monthlyFinance: { income: 100 } },
      meta: { requestId: "test" },
    }).success,
  ).toBe(false);
});
it("accepts absent Quran progress as a genuine empty state", () =>
  expect(
    responseValidators["/v1/quran/progress"]!.get!.safeParse({
      data: null,
      meta: { requestId: "test" },
    }).success,
  ).toBe(true));
