import { markLine } from "@/lib/marks/messages";
import { emojiOf } from "@/lib/marks/rules";
import type { MarkSummary } from "@/lib/marks/store";
import { formatDay } from "@/lib/periods/dates";

/**
 * A session's mark as one line, `Tehty 3.11.2026 😄`, wherever a mark is
 * shown: the child's side, the progress page and the trainer side.
 *
 * decisions/f006-session-marks.md
 * decisions/f007-progress.md
 */
export function MarkLine({ mark, className }: Readonly<{ mark: MarkSummary; className?: string }>) {
  return (
    <p className={className}>
      {markLine(
        mark.status,
        mark.trainedOn === null ? "" : formatDay(mark.trainedOn),
        emojiOf(mark.feeling)
      )}
    </p>
  );
}
