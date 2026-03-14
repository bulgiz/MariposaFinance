// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { AuditBanner } from "./audit-banner";

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AuditBanner />
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>Mariposa Finance — From cocoon to butterfly</p>
      </footer>
    </div>
  );
}
