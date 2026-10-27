const origin = process.env.TEST_API_ORIGIN;
const token = process.env.TEST_ACCESS_TOKEN;
if (!origin?.startsWith("https://") || !token)
  throw new Error(
    "Set TEST_API_ORIGIN (HTTPS) and TEST_ACCESS_TOKEN for an authorized staging account.",
  );
const paths = ["/v1/bootstrap", "/v1/transactions?limit=20", "/v1/home"];
for (const path of paths) {
  const samples: number[] = [];
  let errors = 0;
  const firstStart = performance.now();
  const first = await fetch(origin + path, {
    headers: { Authorization: "Bearer " + token },
    signal: AbortSignal.timeout(30000),
  });
  await first.arrayBuffer();
  const firstMs = performance.now() - firstStart;
  for (let i = 0; i < 50; i++) {
    const start = performance.now();
    const r = await fetch(origin + path, {
      headers: { Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(30000),
    });
    await r.arrayBuffer();
    if (!r.ok) errors++;
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  const percentile = (p: number) =>
    samples[Math.min(samples.length - 1, Math.ceil(p * samples.length) - 1)];
  console.log(
    JSON.stringify({
      path,
      count: samples.length,
      errors,
      firstObservedMs: firstMs,
      idleConfirmed: process.env.IDLE_CONFIRMED === "true",
      p50: percentile(0.5),
      p95: percentile(0.95),
      p99: percentile(0.99),
    }),
  );
}
export {};
