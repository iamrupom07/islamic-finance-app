export const BAJUS_RATES = {
  // Pure 24K baseline (৳243,530 / 11.664 g = ৳20,878.82 / g)
  gold24kPerGram: 20878.82,
  gold24kPerVori: 243530,

  // 22K (most popular jewelry in BD: ৳223,074 / 11.664 g = ৳19,125.00 / g)
  gold22kPerGram: 19125.0,
  gold22kPerVori: 223074,

  // 21K
  gold21kPerGram: 18262.17,
  gold21kPerVori: 213010,

  // 18K
  gold18kPerGram: 15653.29,
  gold18kPerVori: 182580,

  // Silver 22K (cadmium hallmark: ৳2,566 / 11.664 g = ৳220.00 / g)
  silver22kPerGram: 220.0,
  silver22kPerVori: 2566,

  // Silver 21K
  silver21kPerGram: 210.0,
  silver21kPerVori: 2449,

  // Silver 18K
  silver18kPerGram: 180.98,
  silver18kPerVori: 2111,

  // Silver Sanatan (Traditional)
  silverTraditionalPerGram: 135.97,
  silverTraditionalPerVori: 1586,

  // Classical Nisab weights
  goldNisabGrams: 87.48, // 20 Mithqals = 7.5 Vori
  silverNisabGrams: 612.36, // 200 Dirhams = 52.5 Vori

  // Nisab threshold in BDT under BAJUS
  goldNisabBDT: 1826479,
  silverNisabBDT: 134719,

  source: "BAJUS (www.bajus.org/gold-price)",
  sourceName: "Bangladesh Jewellers Association (BAJUS)",
};

export type PricingBenchmark = "BAJUS" | "INTERNATIONAL";

export function getBdNisab(standard: "GOLD" | "SILVER") {
  if (standard === "GOLD") {
    return {
      grams: BAJUS_RATES.goldNisabGrams,
      vori: 7.5,
      ratePerGram: BAJUS_RATES.gold24kPerGram,
      ratePerVori: BAJUS_RATES.gold24kPerVori,
      nisabBDT: BAJUS_RATES.goldNisabBDT,
      formattedNisab: "৳1,826,479",
      formattedRatePerGram: "৳20,879",
      formattedRatePerVori: "৳243,530",
    };
  }
  return {
    grams: BAJUS_RATES.silverNisabGrams,
    vori: 52.5,
    ratePerGram: BAJUS_RATES.silver22kPerGram,
    ratePerVori: BAJUS_RATES.silver22kPerVori,
    nisabBDT: BAJUS_RATES.silverNisabBDT,
    formattedNisab: "৳134,719",
    formattedRatePerGram: "৳220",
    formattedRatePerVori: "৳2,566",
  };
}
