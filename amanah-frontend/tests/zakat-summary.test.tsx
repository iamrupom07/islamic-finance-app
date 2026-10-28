import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ZakatSummaryCard } from "../src/features/zakat/ZakatSummaryCard";
import type { Zakat } from "../src/core/api/types";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

describe("ZakatSummaryCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders CALCULATION_UNAVAILABLE state without fabricating data", async () => {
    const zakat: Zakat = {
      status: "CALCULATION_UNAVAILABLE",
      currency: "BDT",
      estimate: null,
      netEligibleWealth: null,
      eligibleAssets: null,
      eligibleReceivables: null,
      eligibleLiabilities: null,
      nisabValue: null,
      nisabStandard: "SILVER",
      nisabGrams: null,
      annualRate: null,
      policyVersion: null,
      policyId: null,
      sourceAt: null,
      source: null,
      rateSetId: null,
      isStale: false,
      period: null,
      lines: [],
      reasons: ["Reviewed zakat policy or current metal rates required."],
      disclaimer: "",
      fingerprint: "abc",
    };

    const screen = await render(<ZakatSummaryCard zakat={zakat} />);
    expect(screen.getByText("CALCULATION UNAVAILABLE")).toBeTruthy();
    expect(
      screen.getByText(
        "Reviewed zakat policy or current metal rates required.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("due now")).toBeNull();
    expect(screen.queryByText("৳85,000")).toBeNull();
  });

  it("renders NO_ASSETS state with prompt to add assets", async () => {
    const zakat: Zakat = {
      status: "NO_ASSETS",
      currency: "BDT",
      estimate: "0.00",
      netEligibleWealth: "0.00",
      eligibleAssets: "0.00",
      eligibleReceivables: "0.00",
      eligibleLiabilities: "0.00",
      nisabValue: "212500.00",
      nisabStandard: "SILVER",
      nisabGrams: "612.36",
      annualRate: "0.025",
      policyVersion: "1.0",
      policyId: "standard",
      sourceAt: null,
      source: null,
      rateSetId: null,
      isStale: false,
      period: null,
      lines: [],
      reasons: ["No zakat-eligible assets recorded."],
      disclaimer: "",
      fingerprint: "abc",
    };

    const screen = await render(<ZakatSummaryCard zakat={zakat} />);
    expect(screen.getByText("NO ASSETS")).toBeTruthy();
    const addBtn = screen.getByRole("button", { name: "Add new asset" });
    expect(addBtn).toBeTruthy();
    fireEvent.press(addBtn);
    expect(mockPush).toHaveBeenCalledWith("/assets/new");
  });

  it("renders BELOW_NISAB state with shortfall and ৳0.00 due", async () => {
    const zakat: Zakat = {
      status: "BELOW_NISAB",
      currency: "BDT",
      estimate: "0.00",
      netEligibleWealth: "50000.00",
      eligibleAssets: "50000.00",
      eligibleReceivables: "0.00",
      eligibleLiabilities: "0.00",
      nisabValue: "212500.00",
      nisabStandard: "SILVER",
      nisabGrams: "612.36",
      annualRate: "0.025",
      policyVersion: "1.0",
      policyId: "standard",
      sourceAt: null,
      source: null,
      rateSetId: null,
      isStale: false,
      period: null,
      lines: [],
      reasons: ["Net wealth is below silver nisab."],
      disclaimer: "",
      fingerprint: "abc",
    };

    const screen = await render(<ZakatSummaryCard zakat={zakat} />);
    expect(screen.getByText("BELOW NISAB")).toBeTruthy();
    expect(screen.getByText("৳0.00")).toBeTruthy();
    expect(
      screen.getByText("Shortfall: ৳162,500.00 below silver nisab threshold"),
    ).toBeTruthy();
  });

  it("renders YEAR_IN_PROGRESS state with dynamic hawl progress bar", async () => {
    const zakat: Zakat = {
      status: "YEAR_IN_PROGRESS",
      currency: "BDT",
      estimate: "8500.00",
      netEligibleWealth: "340000.00",
      eligibleAssets: "340000.00",
      eligibleReceivables: "0.00",
      eligibleLiabilities: "0.00",
      nisabValue: "212500.00",
      nisabStandard: "SILVER",
      nisabGrams: "612.36",
      annualRate: "0.025",
      policyVersion: "1.0",
      policyId: "standard",
      sourceAt: null,
      source: null,
      rateSetId: null,
      isStale: false,
      period: {
        start: "2026-01-01",
        end: "2026-12-31",
        startHijri: "1447-07-11",
        endHijri: "1448-07-11",
        method: "HIJRI_SOLAR",
      },
      lines: [],
      reasons: [],
      disclaimer: "",
      fingerprint: "abc",
    };

    const screen = await render(<ZakatSummaryCard zakat={zakat} />);
    expect(screen.getByText("৳8,500.00")).toBeTruthy();
    expect(screen.getByText("estimated")).toBeTruthy();
    expect(screen.getByText(/days remaining in hawl/)).toBeTruthy();
  });

  it("renders POTENTIALLY_DUE state with DUE NOW badge and Record payment button", async () => {
    const zakat: Zakat = {
      status: "POTENTIALLY_DUE",
      currency: "BDT",
      estimate: "8500.00",
      netEligibleWealth: "340000.00",
      eligibleAssets: "340000.00",
      eligibleReceivables: "0.00",
      eligibleLiabilities: "0.00",
      nisabValue: "212500.00",
      nisabStandard: "SILVER",
      nisabGrams: "612.36",
      annualRate: "0.025",
      policyVersion: "1.0",
      policyId: "standard",
      sourceAt: null,
      source: null,
      rateSetId: null,
      isStale: false,
      period: {
        start: "2025-10-28",
        end: "2026-10-28",
        startHijri: "1447-04-20",
        endHijri: "1448-04-20",
        method: "HIJRI_SOLAR",
      },
      lines: [],
      reasons: [],
      disclaimer: "",
      fingerprint: "abc",
    };

    const screen = await render(<ZakatSummaryCard zakat={zakat} />);
    expect(screen.getByText("DUE NOW")).toBeTruthy();
    expect(screen.getByText("৳8,500.00")).toBeTruthy();

    const recordBtn = screen.getByRole("button", { name: "Record payment" });
    expect(recordBtn).toBeTruthy();
    fireEvent.press(recordBtn);
    expect(mockPush).toHaveBeenCalledWith("/zakat/record-payment");
  });
});
