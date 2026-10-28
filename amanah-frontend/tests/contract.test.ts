import contract from "../contracts/openapi.json";
import { responseValidators } from "../src/core/api/response-validators";
import mockBundle from "../src/content/bundle.json";
import {
  duaTrack,
  hasDuaAudio,
  getDuaRecordings,
  type ContentBundle,
} from "../src/content/contract";
it("has a runtime validator for every JSON application endpoint", () => {
  for (const [path, methods] of Object.entries(contract.paths)) {
    if (
      !path.startsWith("/v1/") ||
      ["/v1/openapi.json", "/v1/me/export"].includes(path)
    )
      continue;
    for (const method of Object.keys(methods)) {
      const operation = (
        methods as Record<
          string,
          { responses: Record<string, { content?: Record<string, unknown> }> }
        >
      )[method];
      if (operation?.responses["200"]?.content?.["application/json"])
        expect(responseValidators[path]?.[method]).toBeDefined();
    }
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

it("constructs valid audio track for recitable dua with authentic provenance", () => {
  const d = mockBundle.payload.duas[0]!;
  expect(hasDuaAudio(d as any)).toBe(true);
  const recs = getDuaRecordings(d as any);
  expect(recs.length).toBeGreaterThan(0);
  const track = duaTrack(mockBundle as unknown as ContentBundle, d.id);
  expect(track.kind).toBe("DUA");
  expect(track.duaId).toBe(d.id);
  expect(track.artist).toBe("Muhammad Jumah");
  expect(track.rights).toBe("https://opendua.org");
  expect(track.url).toContain("https://audio.opendua.org");
  expect(track.streamAllowed).toBe(true);
});

it("throws TRACK_UNAVAILABLE for non-existent dua", () => {
  expect(() =>
    duaTrack(mockBundle as unknown as ContentBundle, "non-existent"),
  ).toThrow("TRACK_UNAVAILABLE");
});
