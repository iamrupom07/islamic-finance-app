import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { ActionRow, Money, Copy } from "../../design-system/components";
import type { Transaction } from "../../core/api/types";
export function TransactionRow({ record }: { record: Transaction }) {
  const router = useRouter();
  return (
    <View style={{ gap: 4, paddingVertical: 6 }}>
      <ActionRow
        label={record.category.replaceAll("_", " ")}
        detail={record.localDate + (record.isSadaqah ? " · Sadaqah" : "")}
        onPress={() => router.push(`/transactions/${record.id}`)}
      />
      <Money
        value={record.amount}
        currency={record.currency}
        sign={record.type === "INCOME" ? "+" : "−"}
        size={20}
      />
      {record.rateEstimated ? (
        <Copy muted size={12}>
          Estimated conversion at recording time
        </Copy>
      ) : null}
    </View>
  );
}
