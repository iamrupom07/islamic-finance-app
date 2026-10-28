import React, { useState } from "react";
import {
  Screen,
  Card,
  Copy,
  Button,
  ErrorRetry,
} from "../../design-system/components";
import { usePrivacy } from "../../core/privacy/PrivacyProvider";
export function PrivacyScreen() {
  const p = usePrivacy();
  const [error, setError] = useState<unknown>(null);
  return (
    <Screen title="Device privacy" back>
      <Card>
        <Copy>
          Hide balances masks the shared amount displays. Exports and editable
          amount fields remain visible when you open them.
        </Copy>
        <Button
          label={p.hidden ? "Show balances" : "Hide balances"}
          onPress={() => {
            void p.toggleHidden().catch(setError);
          }}
        />
        <Copy>
          App lock uses the device biometric or passcode prompt. It protects
          this device interface and does not replace server authentication.
        </Copy>
        <Button
          label={p.enabled ? "Disable app lock" : "Enable app lock"}
          onPress={() => {
            void p.setEnabled(!p.enabled).catch(setError);
          }}
        />
      </Card>
      {error ? <ErrorRetry error={error} /> : null}
    </Screen>
  );
}
