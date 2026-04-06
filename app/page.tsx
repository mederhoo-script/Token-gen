import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          Deploy ERC20 Tokens <span className="text-primary">Instantly</span>
        </h1>
        <p className="mb-8 max-w-xl text-lg text-muted-foreground">
          Create and deploy custom ERC20 tokens on Sepolia without writing a single line of code.
          No coding experience required.
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link href="/signup">Get Started Free</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            { title: "No Code Required", desc: "Fill a form and click deploy." },
            { title: "Sepolia Testnet", desc: "Safe, free testnet deployments." },
            { title: "Etherscan Verified", desc: "Every token is traceable on-chain." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border p-6 text-left shadow-sm">
              <h3 className="mb-2 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
