import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { AssetsScreen } from "../src/features/assets/HoldingsScreens";
import { AssetForm } from "../src/features/assets/AssetForm";
import { DebtForm } from "../src/features/debts/DebtForm";
import { ZakatScreen } from "../src/features/zakat/ZakatScreens";
import { FinanceScreen } from "../src/features/finance/FinanceScreen";
import { useAccountQuery, useAccountMutation } from "../src/core/api/hooks";
import { api } from "../src/core/api/client";
const mockPush = jest.fn();
const mockPreference = {
  version: 1,
  currency: "BDT",
  locale: "en",
  appearance: "light",
  cityId: "dhaka",
  timezone: "Asia/Dhaka",
  methodId: 1,
  school: 1,
  nisabStandard: "SILVER",
  policyVersionId: null,
  hijriAnchor: null,
  continuityConfirmed: false,
  setupStep: 0,
  setupCompletedAt: null,
  reminders: { prayers: [], anniversaryDays: [], weeklySummary: false },
};
const mockPending = () => ({
  data: undefined,
  error: null,
  isPending: true,
  isRefetching: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
});
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  }),
  usePreventRemove: jest.fn(),
  useLocalSearchParams: () => ({ id: "test", surah: "1", category: "Morning" }),
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: require("react-native").View,
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));
jest.mock(
  "lucide-react-native",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock("../src/core/auth/AuthProvider", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: { id: "test", email: "test@example.test" },
    account: {
      user: { id: "test", email: "test@example.test" },
      preferences: mockPreference,
    },
    reload: jest.fn(),
    clear: jest.fn(),
    logout: jest.fn(),
  }),
}));
jest.mock("../src/core/api/client", () => ({
  api: {
    GET: jest.fn(),
    POST: jest.fn(),
    PATCH: jest.fn(),
    PUT: jest.fn(),
    DELETE: jest.fn(),
  },
  dataOf: (r: any) => r.data.data,
  queryClient: { invalidateQueries: jest.fn() },
}));
jest.mock("../src/core/api/hooks", () => ({
  useAccountQuery: jest.fn(() => mockPending()),
  useAccountMutation: jest.fn(() => ({
    error: null,
    isPending: false,
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
  })),
}));
jest.mock("@tanstack/react-query", () => ({
  useQuery: () => mockPending(),
  useInfiniteQuery: () => mockPending(),
}));
jest.mock("../src/content/ContentProvider", () => ({
  useContent: () => ({ bundle: null, loading: false }),
}));
jest.mock("../src/core/notifications/scheduler", () => ({
  requestReminderPermission: jest.fn(async () => false),
  reconcileReminders: jest.fn(async () => {}),
  reminderCoverage: jest.fn(async () => null),
}));
jest.mock("../src/core/storage/export-file", () => ({
  shareExport: jest.fn(async () => {}),
}));
jest.mock("../src/features/auth/social", () => ({
  socialProof: jest.fn(),
  socialLogin: jest.fn(),
}));

describe("Phase 1 behavior regressions", () => {
  beforeEach(() => {
    jest
      .mocked(useAccountQuery)
      .mockReset()
      .mockImplementation(() => mockPending() as any);
    mockPush.mockClear();
  });
  it("an empty holdings screen does not display sample assets", async () => {
    const r = await render(<AssetsScreen />);
    expect(r.queryByText("৳120,000")).toBeNull();
    expect(r.queryByText("5 holdings recorded")).toBeNull();
    await r.unmount();
  });
  it("an unavailable assessment does not display a payment or above-nisab claim", async () => {
    const r = await render(<ZakatScreen />);
    expect(r.queryByText("৳15,000")).toBeNull();
    expect(r.queryByText("Above nisab")).toBeNull();
    expect(
      r.queryByRole("button", { name: "Record paid elsewhere" }),
    ).toBeNull();
    await r.unmount();
  });
  it("below-nisab wealth displays zero estimate and no new-payment action", async () => {
    const summary = {
      status: "BELOW_NISAB",
      currency: "BDT",
      estimate: "0",
      eligibleAssets: "100",
      eligibleReceivables: "0",
      eligibleLiabilities: "0",
      netEligibleWealth: "100",
      nisabValue: "500",
      nisabStandard: "SILVER",
      nisabGrams: "500",
      annualRate: "0.025",
      period: null,
      source: null,
      sourceAt: null,
      isStale: false,
      reasons: [],
      lines: [],
      disclaimer: "Test",
      policyVersion: "TEST",
    };
    jest.mocked(useAccountQuery).mockImplementation(
      (key: any) =>
        ({
          ...mockPending(),
          isPending: false,
          data: key[0] === "zakat" ? summary : undefined,
        }) as any,
    );
    const r = await render(<ZakatScreen />);
    expect(r.getByText("BELOW NISAB")).toBeTruthy();
    expect(r.getAllByText("৳0.00").length).toBeGreaterThan(0);
    expect(r.queryByText("Above nisab")).toBeNull();
    expect(
      r.queryByRole("button", { name: "Record paid elsewhere" }),
    ).toBeNull();
    await r.unmount();
  });
  it("zero report values remain zero and category data stays empty", async () => {
    const report = {
      month: "2026-10",
      currency: "BDT",
      status: "AVAILABLE",
      income: "0",
      expenses: "0",
      sadaqah: "0",
      categories: [],
      reasons: [],
    };
    jest.mocked(useAccountQuery).mockReturnValue({
      ...mockPending(),
      isPending: false,
      data: {
        report,
        trend: [report],
        lifetimeSadaqah: "0",
        lifetimeStatus: "AVAILABLE",
      },
    } as any);
    const r = await render(<FinanceScreen />);
    expect(r.queryByText("৳78,000")).toBeNull();
    expect(r.getAllByText("৳0.00")).toHaveLength(4);
    await fireEvent.press(r.getByRole("button", { name: "Income" }));
    expect(mockPush.mock.calls.at(-1)[0]).toMatch(
      /\/transactions\?month=\d{4}-\d{2}&type=INCOME/,
    );
    await r.unmount();
  });
  it("note-only debt editing preserves a partially repaid balance", async () => {
    const work: any[] = [];
    jest.mocked(useAccountMutation).mockImplementation((fn: any) => {
      work.push(fn);
      return {
        error: null,
        isPending: false,
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
      } as any;
    });
    jest.mocked(api.PATCH).mockResolvedValue({ data: { data: {} } } as any);
    const record = {
      id: "00000000-0000-4000-8000-000000000001",
      direction: "I_OWE",
      label: "Loan",
      originalAmount: "1000",
      remainingAmount: "200",
      currency: "BDT",
      openedOn: "2026-10-01",
      dueOn: "2026-11-01",
      recoverability: "RECOVERABLE",
      version: 2,
      note: "Existing",
    };
    const r = await render(<DebtForm record={record as any} />);
    await work[0]({ ...record, note: "Updated note" });
    expect(
      (jest.mocked(api.PATCH).mock.calls.at(-1)?.[1] as any)?.body,
    ).toEqual(
      expect.objectContaining({ remainingAmount: "200", note: "Updated note" }),
    );
    await r.unmount();
  });
  it("manual metal saving preserves mode, price and notes despite a weight draft", async () => {
    const work: any[] = [];
    jest.mocked(useAccountMutation).mockImplementation((fn: any) => {
      work.push(fn);
      return {
        error: null,
        isPending: false,
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
      } as any;
    });
    jest.mocked(api.POST).mockResolvedValue({ data: { data: {} } } as any);
    const r = await render(<AssetForm />);
    await work[0]({
      type: "GOLD",
      label: "Gold",
      currency: "BDT",
      valuationMode: "MANUAL",
      declaredValue: "500",
      weightGrams: "20",
      weightUnit: "g",
      purity: "0.916667",
      valuedOn: "2026-10-26",
      note: "Keep",
    });
    expect((jest.mocked(api.POST).mock.calls.at(-1)?.[1] as any)?.body).toEqual(
      expect.objectContaining({
        valuationMode: "MANUAL",
        declaredValue: "500",
        weightGrams: null,
        purity: null,
        note: "Keep",
      }),
    );
    await r.unmount();
  });
  it("weight-based saving sends both normalized grams and original units", async () => {
    const work: any[] = [];
    jest.mocked(useAccountMutation).mockImplementation((fn: any) => {
      work.push(fn);
      return {
        error: null,
        isPending: false,
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
      } as any;
    });
    jest.mocked(api.POST).mockResolvedValue({ data: { data: {} } } as any);
    const r = await render(<AssetForm />);
    await work[0]({
      type: "GOLD",
      label: "Gold",
      currency: "BDT",
      valuationMode: "METAL_RATE",
      declaredValue: "",
      weightGrams: "1",
      weightUnit: "bhori",
      purity: "1",
      valuedOn: "2026-10-26",
      note: "",
    });
    expect((jest.mocked(api.POST).mock.calls.at(-1)?.[1] as any)?.body).toEqual(
      expect.objectContaining({
        weightGrams: "11.664000",
        weightQuantity: "1",
        weightUnit: "bhori",
        declaredValue: null,
      }),
    );
    await r.unmount();
  });
  it("gold asset entry auto-computes weight in grams from bhori and sets null declaredValue", async () => {
    const work: any[] = [];
    jest.mocked(useAccountMutation).mockImplementation((fn: any) => {
      work.push(fn);
      return {
        error: null,
        isPending: false,
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
      } as any;
    });
    jest.mocked(api.POST).mockResolvedValue({ data: { data: {} } } as any);
    const r = await render(<AssetForm />);
    await work[0]({
      type: "GOLD",
      label: "Gold Jewellery",
      currency: "BDT",
      valuationMode: "METAL_RATE",
      declaredValue: "",
      weightQuantity: "2.5",
      weightUnit: "bhori",
      purity: "0.916",
      valuedOn: "2026-10-28",
      note: "Family gold",
    });
    expect((jest.mocked(api.POST).mock.calls.at(-1)?.[1] as any)?.body).toEqual(
      expect.objectContaining({
        type: "GOLD",
        label: "Gold Jewellery",
        valuationMode: "METAL_RATE",
        declaredValue: null,
        weightQuantity: "2.5",
        weightUnit: "bhori",
        weightGrams: "29.160000",
        purity: "0.916",
        note: "Family gold",
      }),
    );
    await r.unmount();
  });
  it("silver asset entry auto-computes weight in grams from tola and sets purity and null declaredValue", async () => {
    const work: any[] = [];
    jest.mocked(useAccountMutation).mockImplementation((fn: any) => {
      work.push(fn);
      return {
        error: null,
        isPending: false,
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
      } as any;
    });
    jest.mocked(api.POST).mockResolvedValue({ data: { data: {} } } as any);
    const r = await render(<AssetForm />);
    await work[0]({
      type: "SILVER",
      label: "Silver coins",
      currency: "BDT",
      valuationMode: "METAL_RATE",
      declaredValue: "",
      weightQuantity: "10",
      weightUnit: "tola",
      purity: "0.925",
      valuedOn: "2026-10-28",
      note: null,
    });
    expect((jest.mocked(api.POST).mock.calls.at(-1)?.[1] as any)?.body).toEqual(
      expect.objectContaining({
        type: "SILVER",
        label: "Silver coins",
        valuationMode: "METAL_RATE",
        declaredValue: null,
        weightQuantity: "10",
        weightUnit: "tola",
        weightGrams: "116.638038",
        purity: "0.925",
      }),
    );
    await r.unmount();
  });
  it("cash asset entry uses declaredValue and omits metal weight fields", async () => {
    const work: any[] = [];
    jest.mocked(useAccountMutation).mockImplementation((fn: any) => {
      work.push(fn);
      return {
        error: null,
        isPending: false,
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
      } as any;
    });
    jest.mocked(api.POST).mockResolvedValue({ data: { data: {} } } as any);
    const r = await render(<AssetForm />);
    await work[0]({
      type: "CASH",
      label: "Cash in hand",
      currency: "BDT",
      valuationMode: "MANUAL",
      declaredValue: "25000",
      valuedOn: "2026-10-28",
      note: "Emergency cash",
    });
    expect((jest.mocked(api.POST).mock.calls.at(-1)?.[1] as any)?.body).toEqual(
      expect.objectContaining({
        type: "CASH",
        label: "Cash in hand",
        valuationMode: "MANUAL",
        declaredValue: "25000",
        weightGrams: null,
        weightQuantity: null,
        weightUnit: null,
        purity: null,
        note: "Emergency cash",
      }),
    );
    await r.unmount();
  });
});
