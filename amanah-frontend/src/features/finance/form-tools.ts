import { useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import { z } from "zod";
import { usePreventRemove } from "expo-router";
import { Alert } from "react-native";
export const positive = z
  .string()
  .regex(
    /^(?:0|[1-9]\d{0,13})(?:\.\d{1,4})?$/,
    "Use a decimal amount, up to 4 decimal places.",
  )
  .refine((v) => /[1-9]/.test(v), "Enter a positive amount.");
export const zeroOrPositive = z
  .string()
  .regex(/^(?:0|[1-9]\d{0,13})(?:\.\d{1,4})?$/);
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Use a valid date.",
  );
export const currencyOptions = [
  "BDT",
  "USD",
  "EUR",
  "GBP",
  "SAR",
  "AED",
  "INR",
  "MYR",
  "CAD",
  "AUD",
].map((value) => ({ label: value, value }));
export function useRetryKey() {
  const record = useRef({ body: "", key: "" });
  return (body: unknown) => {
    const next = JSON.stringify(body);
    if (next !== record.current.body) {
      record.current = { body: next, key: Crypto.randomUUID() };
    }
    return record.current.key;
  };
}
export function useFormGuard(dirty: boolean) {
  const [discarded, setDiscarded] = useState(false);
  usePreventRemove(dirty && !discarded, ({ repeat }) =>
    Alert.alert(
      "Discard unsaved changes?",
      "Your draft is still on this screen.",
      [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            setDiscarded(true);
            repeat();
          },
        },
      ],
    ),
  );
}
