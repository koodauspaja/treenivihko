"use client";

/**
 * What a reader sees when a page fails, for example when the database does not
 * answer while the session is read: Finnish, with a retry, in place of Next's
 * English default. decisions/029-sign-in.md
 */
export default function ErrorPage({ retry }: Readonly<{ retry: () => void }>) {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold">Treenivihko</h1>
      <p role="alert" className="mt-4">
        Jokin meni vikaan.
      </p>
      <button type="button" className="mt-6 rounded border px-4 py-2" onClick={() => retry()}>
        Yritä uudelleen
      </button>
    </main>
  );
}
