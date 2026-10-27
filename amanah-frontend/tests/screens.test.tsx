import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { HomeScreen } from "../src/features/home/HomeScreen";
import { FinanceScreen } from "../src/features/finance/FinanceScreen";
import {
  TransactionsScreen,
  TransactionDetailScreen,
  NewTransactionScreen,
} from "../src/features/finance/TransactionScreens";
import {
  AssetsScreen,
  AssetDetailScreen,
  DebtsScreen,
  DebtDetailScreen,
} from "../src/features/assets/HoldingsScreens";
import { AssetForm } from "../src/features/assets/AssetForm";
import { DebtForm } from "../src/features/debts/DebtForm";
import {
  ZakatScreen,
  ZakatHistoryScreen,
  ZakatHistoryDetailScreen,
  RecordPaymentScreen,
  PaymentSuccessScreen,
} from "../src/features/zakat/ZakatScreens";
import { PrayerScreen } from "../src/features/prayer/PrayerScreen";
import {
  QuranScreen,
  QuranReaderScreen,
  QuranBookmarksScreen,
} from "../src/features/quran/QuranScreens";
import {
  DuaScreen,
  DuaCategoryScreen,
  DuaDetailScreen,
  DuaFavoritesScreen,
} from "../src/features/dua/DuaScreens";
import {
  ProfileScreen,
  PreferenceScreen,
  LocationSettingsScreen,
  NisabSettingsScreen,
  NotificationSettingsScreen,
  ExportScreen,
  AboutScreen,
  DeleteAccountScreen,
} from "../src/features/settings/SettingsScreens";
import { AuthScreen } from "../src/features/auth/AuthScreen";
import { SetupScreen } from "../src/features/onboarding/SetupScreen";
import { WelcomeScreen } from "../src/features/onboarding/WelcomeScreen";
import { useAccountQuery } from "../src/core/api/hooks";
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
  useAccountMutation: () => ({
    error: null,
    isPending: false,
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
  }),
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
}));
jest.mock("../src/core/storage/export-file", () => ({
  shareExport: jest.fn(async () => {}),
}));
jest.mock("../src/features/auth/social", () => ({
  socialProof: jest.fn(),
  socialLogin: jest.fn(),
}));
const screens: [string, React.ReactElement][] = [
  ["Home", <HomeScreen />],
  ["Finance", <FinanceScreen />],
  ["Transactions", <TransactionsScreen />],
  ["Transaction detail", <TransactionDetailScreen />],
  ["New transaction", <NewTransactionScreen />],
  ["Assets", <AssetsScreen />],
  ["Asset detail", <AssetDetailScreen />],
  ["Asset form", <AssetForm />],
  ["Debts", <DebtsScreen />],
  ["Debt detail", <DebtDetailScreen />],
  ["Debt form", <DebtForm />],
  ["Zakat", <ZakatScreen />],
  ["Zakat history", <ZakatHistoryScreen />],
  ["Zakat history detail", <ZakatHistoryDetailScreen />],
  ["Record payment", <RecordPaymentScreen />],
  ["Payment success", <PaymentSuccessScreen />],
  ["Prayer", <PrayerScreen />],
  ["Quran library", <QuranScreen />],
  ["Quran reader", <QuranReaderScreen />],
  ["Quran bookmarks", <QuranBookmarksScreen />],
  ["Dua library", <DuaScreen />],
  ["Dua category", <DuaCategoryScreen />],
  ["Dua detail", <DuaDetailScreen />],
  ["Dua favorites", <DuaFavoritesScreen />],
  ["Profile", <ProfileScreen />],
  ["Currency", <PreferenceScreen kind="currency" />],
  ["Appearance", <PreferenceScreen kind="appearance" />],
  ["Language", <PreferenceScreen kind="language" />],
  ["Location", <LocationSettingsScreen />],
  ["Nisab", <NisabSettingsScreen />],
  ["Notifications", <NotificationSettingsScreen />],
  ["Export", <ExportScreen />],
  ["About", <AboutScreen />],
  ["Delete account", <DeleteAccountScreen />],
  ["Login", <AuthScreen mode="login" />],
  ["Register", <AuthScreen mode="register" />],
  ["Recovery", <AuthScreen mode="forgot" />],
  ["Reset completion", <AuthScreen mode="reset" />],
  ["Verify email", <AuthScreen mode="verify" />],
  ["Welcome", <WelcomeScreen />],
  ...(["permissions", "city", "currency", "nisab", "prayer"] as const).map(
    (step) =>
      ["Setup " + step, <SetupScreen step={step} />] as [
        string,
        React.ReactElement,
      ],
  ),
];
it.each(screens)(
  "renders %s without requiring fabricated user/provider data",
  async (_name, node) => {
    const screen = await render(node);
    expect(screen.toJSON()).toBeTruthy();
    await screen.unmount();
  },
);
it("shows a real empty Home and routes Add expense to the form", async () => {
  jest.mocked(useAccountQuery).mockReturnValueOnce({
    data: {
      monthlyFinance: { income: "0.00", expenses: "0.00", currency: "BDT" },
      zakat: {
        estimate: null,
        currency: "BDT",
        status: "CALCULATION_UNAVAILABLE",
        reasons: ["Reviewed policy required"],
      },
      prayer: null,
      prayerUnavailableReason: "Unavailable",
      recentTransactions: [],
    },
    error: null,
    isPending: false,
    refetch: jest.fn(),
  } as any);
  const screen = await render(<HomeScreen />);
  expect(screen.getByText("CALCULATION UNAVAILABLE")).toBeTruthy();
  expect(screen.queryByText("Due now")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Add expense" }));
  expect(mockPush).toHaveBeenCalledWith("/transactions/new?type=EXPENSE");
});
