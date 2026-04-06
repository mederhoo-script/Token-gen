import { TokenForm } from "@/components/tokens/TokenForm";

export default function CreateTokenPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Deploy a Token</h1>
        <p className="text-muted-foreground">
          Fill out the form below to deploy your custom ERC20 token on Sepolia.
        </p>
      </div>
      <TokenForm />
    </div>
  );
}
