import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
          <span className="text-primary">Mariposa</span>{" "}
          <span className="text-accent">Finance</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
          Multi-chain DeFi yield aggregator with auto-compounding vaults.
          Earn the best yields across Base and Arbitrum — effortlessly.
        </p>
        <p className="text-sm italic text-muted-foreground">
          From cocoon to butterfly
        </p>

        <div className="flex items-center gap-4 mt-4">
          <Link
            href="/jardines"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Explore Jardines
          </Link>
          <Link
            href="/portfolio"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-input bg-transparent px-8 text-lg font-semibold transition-colors hover:bg-secondary"
          >
            My Portfolio
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 pb-24 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-3 text-3xl">🦋</div>
          <h3 className="mb-2 text-lg font-semibold">Jardines (Vaults)</h3>
          <p className="text-sm text-muted-foreground">
            Auto-compounding vaults that harvest and reinvest your yields
            across top DeFi protocols.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-3 text-3xl">🔗</div>
          <h3 className="mb-2 text-lg font-semibold">Multi-Chain</h3>
          <p className="text-sm text-muted-foreground">
            Base, Arbitrum, and more coming soon. Find the best yields
            regardless of which chain they live on.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-3 text-3xl">🪙</div>
          <h3 className="mb-2 text-lg font-semibold">$CAPULLO (Coming Soon)</h3>
          <p className="text-sm text-muted-foreground">
            Earn Alas points now. Convert to $CAPULLO tokens at launch for
            revenue sharing and governance.
          </p>
        </div>
      </section>
    </div>
  );
}
