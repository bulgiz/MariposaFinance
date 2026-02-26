"use client";

import type { TransactionStep } from "@mariposa/core";
import { getChainConfig } from "@mariposa/core";
import type { ChainId } from "@mariposa/core";

function StatusIcon({ status }: { status: TransactionStep["status"] }) {
  switch (status) {
    case "idle":
      return (
        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
      );
    case "pending-wallet":
      return (
        <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      );
    case "pending-confirmation":
      return (
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      );
    case "confirmed":
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case "failed":
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive">
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
  }
}

function statusLabel(status: TransactionStep["status"]): string {
  switch (status) {
    case "idle":
      return "Waiting";
    case "pending-wallet":
      return "Confirm in wallet";
    case "pending-confirmation":
      return "Confirming...";
    case "confirmed":
      return "Done";
    case "failed":
      return "Failed";
  }
}

interface TransactionStepsProps {
  steps: TransactionStep[];
  chainId: ChainId;
}

export function TransactionSteps({ steps, chainId }: TransactionStepsProps) {
  const chain = getChainConfig(chainId);

  if (steps.length === 0) return null;

  return (
    <div className="space-y-3 mt-4">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-3">
          <StatusIcon status={step.status} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{step.label}</div>
            <div className="text-xs text-muted-foreground">
              {statusLabel(step.status)}
            </div>
            {step.error && (
              <div className="text-xs text-destructive mt-0.5 truncate">
                {step.error}
              </div>
            )}
          </div>
          {step.txHash && (
            <a
              href={`${chain.explorerUrl}/tx/${step.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline shrink-0"
            >
              View tx
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
