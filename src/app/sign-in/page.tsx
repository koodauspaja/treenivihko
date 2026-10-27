import { Suspense } from "react";
import { SignInButton } from "@/components/sign-in-button";
import { SignInError } from "@/components/sign-in-error";

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold">Treenivihko</h1>
      <p className="mt-4">Kirjaudu sisään jatkaaksesi.</p>
      <Suspense fallback={null}>
        <SignInError searchParams={searchParams} />
      </Suspense>
      <SignInButton />
    </main>
  );
}
