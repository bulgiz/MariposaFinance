"use client";

import { cn } from "@mariposa/ui";
import type { Protocol } from "@mariposa/core";
import { useAppStore } from "@/lib/store";

const protocols: { value: Protocol; label: string; color: string }[] = [
  { value: "aerodrome", label: "Aerodrome", color: "bg-blue-600" },
  { value: "uniswap-v3", label: "Uniswap V3", color: "bg-pink-600" },
  { value: "camelot", label: "Camelot", color: "bg-amber-600" },
  { value: "aave-v3", label: "Aave V3", color: "bg-purple-600" },
];

export function ProtocolFilter() {
  const { selectedProtocol, setSelectedProtocol } = useAppStore();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => setSelectedProtocol(null)}
        className={cn(
          "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
          selectedProtocol === null
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        )}
      >
        All Protocols
      </button>
      {protocols.map((proto) => (
        <button
          key={proto.value}
          onClick={() =>
            setSelectedProtocol(
              selectedProtocol === proto.value ? null : proto.value
            )
          }
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            selectedProtocol === proto.value
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          <span className={`inline-block h-2 w-2 rounded-full ${proto.color}`} />
          {proto.label}
        </button>
      ))}
    </div>
  );
}
