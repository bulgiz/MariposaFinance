import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mariposa Finance — Multi-Chain DeFi Yield Aggregator",
  description:
    "Auto-compounding vaults across Base, Arbitrum, and more. From cocoon to butterfly.",
  keywords: ["DeFi", "yield", "aggregator", "vaults", "Base", "Arbitrum"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
              <p>Mariposa Finance — From cocoon to butterfly</p>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
