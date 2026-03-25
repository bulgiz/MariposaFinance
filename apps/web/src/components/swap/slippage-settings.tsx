// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { useState } from "react";
import { Button, Input } from "@mariposa/ui";

const PRESETS = [0.5, 1, 2, 3] as const;

interface SlippageSettingsProps {
  slippage: number;
  onSlippageChange: (value: number) => void;
}

export function SlippageSettings({
  slippage,
  onSlippageChange,
}: SlippageSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const isCustom = !PRESETS.includes(slippage as (typeof PRESETS)[number]);

  const handleCustomChange = (value: string) => {
    setCustomValue(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0 && num <= 50) {
      onSlippageChange(num);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        {slippage}% slippage
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-card p-4 shadow-xl">
          <div className="mb-3 text-sm font-medium">Slippage Tolerance</div>

          <div className="flex gap-2 mb-3">
            {PRESETS.map((preset) => (
              <Button
                key={preset}
                variant={slippage === preset ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => {
                  onSlippageChange(preset);
                  setCustomValue("");
                }}
              >
                {preset}%
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Custom"
              value={customValue}
              onChange={(e) => handleCustomChange(e.target.value)}
              className="h-8 text-sm"
              min={0.01}
              max={50}
              step={0.1}
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>

          {slippage > 5 && (
            <p className="mt-2 text-xs text-amber-400">
              High slippage may result in an unfavorable trade.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
