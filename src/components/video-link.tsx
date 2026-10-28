import { WATCH_VIDEO } from "@/lib/exercises/messages";

/**
 * An exercise's video, `Katso video`, in a new tab that gets neither this
 * page nor its address.
 *
 * decisions/f002-exercise-library.md
 * decisions/f005-notebook-view.md
 */
export function VideoLink({ url }: Readonly<{ url: string | null }>) {
  return url === null ? null : (
    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block underline">
      {WATCH_VIDEO}
    </a>
  );
}
