// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { useState } from "react";

export function AuditBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative bg-accent/10 border-b border-accent/20 py-2 text-center text-sm text-accent">
      <span className="font-medium">Security Audit In Progress</span>
      <span className="mx-2 text-accent/60">|</span>
      <span className="text-accent/80">
        Vault deposits are temporarily disabled while smart contracts are being audited.
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-accent/60 hover:text-accent transition-colors"
        aria-label="Dismiss banner"
      >
        &times;
      </button>
    </div>
  );
}
