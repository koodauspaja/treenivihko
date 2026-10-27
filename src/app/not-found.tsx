import Link from "next/link";
import { SIGNED_IN_PATH } from "@/lib/auth/paths";

/** Any address that does not exist, in Finnish rather than Next's English. decisions/f002-exercise-library.md */
export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold">Treenivihko</h1>
      <p className="mt-4">Sivua ei löytynyt.</p>
      <Link href={SIGNED_IN_PATH} className="mt-8 inline-block underline">
        Etusivulle
      </Link>
    </main>
  );
}
