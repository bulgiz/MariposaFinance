// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { Card, CardContent } from "@mariposa/ui";

export function VaultComingSoon() {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="text-4xl">🦋</div>
        <h3 className="text-lg font-semibold">Jardines Vaults — Coming Soon</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Deposit and withdraw functionality is currently undergoing a security
          audit. Vaults will be enabled once the audit is complete.
        </p>
        <div className="mt-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent">
          Audit in Progress
        </div>
      </CardContent>
    </Card>
  );
}
