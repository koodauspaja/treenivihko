import { formatDay, today } from "@/lib/periods/dates";
import {
  ACCOMPLISHMENTS_HEADING,
  accomplishmentName,
  bestStreakLine,
  childStreakLines,
  currentStreakLine,
  GOALS_HEADING,
  goalLine,
  NO_ACCOMPLISHMENTS,
  pauseSpan,
  STREAK_HEADING,
} from "@/lib/streaks/messages";
import { earnedKey, goalsOf } from "@/lib/streaks/rules";
import { type Achievements, getAchievements } from "@/lib/streaks/store";

/**
 * The streak and the accomplishments on the child's side: the streak's
 * lines under the greeting, and the sections `Omat treenit` shows. Loading
 * either records what has been earned.
 *
 * decisions/f007-progress.md
 * decisions/f008-streaks-and-accomplishments.md
 */

/** The streak's lines under the greeting, for today in Finland. */
export async function StreakLines({ userId }: Readonly<{ userId: string }>) {
  const { streak, pause } = await getAchievements(userId, today());
  const lines = childStreakLines({
    current: streak.current,
    thisWeekDone: streak.thisWeekDone,
    pause: pause === null ? null : pauseSpan(pause),
  });
  return (
    <div className="mt-4">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

/** The streak, the accomplishments earned and the next goals, as `Omat treenit` shows them. */
export function AchievementSections({ achievements }: Readonly<{ achievements: Achievements }>) {
  const { streak, done, earned } = achievements;
  const goals = goalsOf({
    earned: new Set(earned.map((each) => earnedKey({ kind: each.kind, key: "" }))),
    done,
    streak: streak.current,
  });
  return (
    <>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">{STREAK_HEADING}</h2>
        <p className="mt-1">{currentStreakLine(streak.current)}</p>
        <p>{bestStreakLine(streak.best)}</p>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">{ACCOMPLISHMENTS_HEADING}</h2>
        {earned.length === 0 ? (
          <p className="mt-2">{NO_ACCOMPLISHMENTS}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {earned.map((each) => (
              <li key={each.id}>
                <p className="font-semibold break-words">{accomplishmentName(each)}</p>
                <p className="text-sm">{formatDay(each.earnedOn)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      {goals.length === 0 ? null : (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">{GOALS_HEADING}</h2>
          {goals.map((each) => (
            <p key={each.kind} className="mt-1">
              {goalLine(
                accomplishmentName({
                  kind: each.kind,
                  periodStartsOn: null,
                  periodWeeks: null,
                  exerciseName: null,
                }),
                each.have,
                each.goal
              )}
            </p>
          ))}
        </section>
      )}
    </>
  );
}
