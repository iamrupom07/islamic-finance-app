import React from "react";
import { Linking } from "react-native";
import {
  Card,
  Copy,
  Money,
  QueryState,
  ActionRow,
} from "../../design-system/components";
import { api, dataOf } from "../../core/api/client";
import { useAccountQuery } from "../../core/api/hooks";
import { useAuth } from "../../core/auth/AuthProvider";
export function MarketCard() {
  const { account } = useAuth();
  const currency = account?.preferences.currency ?? "BDT";
  const q = useAccountQuery(
    ["market", currency],
    async () =>
      dataOf(
        await api.GET("/v1/market/daily", { params: { query: { currency } } }),
      ),
    true,
  );
  return (
    <Card>
      <Copy medium size={20}>
        Daily metal reference
      </Copy>
      <QueryState query={q}>
        {q.data ? (
          <>
            <Copy>{q.data.status}</Copy>
            <Copy>Pure gold · per gram</Copy>
            <Money value={q.data.goldPerGram} currency={currency} />
            <Copy>Pure silver · per gram</Copy>
            <Money value={q.data.silverPerGram} currency={currency} />
            <Copy>Gold nisab</Copy>
            <Money value={q.data.goldNisab} currency={currency} />
            <Copy muted>
              {q.data.goldGrams
                ? `${q.data.goldGrams} g pure gold`
                : "Reviewed policy required"}
            </Copy>
            <Copy>Silver nisab</Copy>
            <Money value={q.data.silverNisab} currency={currency} />
            <Copy muted>
              {q.data.silverGrams
                ? `${q.data.silverGrams} g pure silver`
                : "Reviewed policy required"}
            </Copy>
            <Copy
              muted
            >{`Selected standard: ${q.data.selectedStandard} · Policy: ${q.data.policyVersion ?? "unavailable"}`}</Copy>
            <Copy
              muted
            >{`Reference timestamp: ${q.data.sourceAt ?? "unavailable"}`}</Copy>
            <Copy
              muted
            >{`Retrieved: ${q.data.fetchedAt ?? "unavailable"}`}</Copy>
            <Copy muted>
              Spot reference; jewellery retail and dealer buyback prices can
              differ.
            </Copy>
            {q.data.reasons.map((reason, i) => (
              <Copy key={i} muted>
                {reason}
              </Copy>
            ))}
            {q.data.credits.map((c) => (
              <ActionRow
                key={c.url}
                label={c.name}
                detail={c.purpose}
                onPress={() => {
                  void Linking.openURL(c.url);
                }}
              />
            ))}
          </>
        ) : null}
      </QueryState>
    </Card>
  );
}
