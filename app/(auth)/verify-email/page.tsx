import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="text-5xl">📧</div>
        <h1 className="text-3xl font-bold">Check your email</h1>
        <p className="text-muted-foreground">
          We sent you a verification link. Click it to activate your account.
        </p>
        <Button asChild variant="outline">
          <Link href="/login">Back to login</Link>
        </Button>
      </div>
    </div>
  );
}
