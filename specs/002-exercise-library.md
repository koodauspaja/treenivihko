# 002 — Exercise library

Issue: #35

## Summary

The parent keeps the library that every session is built from: exercises
(*harjoite*), each with a short name the child can copy into the notebook,
instructions, an amount, a duration, a level and labels from one fixed list.
Later features plan sessions, import exercises and let the AI choose only from
this library, so its shape is set here.

## Scope

**In**

- The exercise: its fields, and the fixed label list with each label's meaning.
- Adding, editing and deleting exercises, on the trainer side only.
- The library's list, sorted by name and filtered by skill, place and equipment.
- The trainer side's first page as a menu, and the nickname on a page of its own.
- **Lukitse ja palaa** in place of Feature 001's **Lukitse**, with the same behaviour.
- A Finnish page for an address that does not exist.

**Out**

- Importing exercises from a file: Feature 003.
- Using exercises in sessions, and what deleting one in use means: Feature 004.
- Search, embedded video, pictures, and saved blocks.
- Changing the label list in the app: it changes with a pull request.
- The child seeing the library: the child sees exercises only in sessions.

## Who and where

The parent, at home on wifi, on the trainer side, behind its password
(Feature 001). The child never reaches any of it.

## The exercise

| Field | Finnish label | Rule |
|---|---|---|
| Name | `Nimi` | Trimmed, 1–40 characters (counted as Feature 001 counts a nickname); unique within the library whatever its case |
| Instructions | `Ohje` | Trimmed, 1–1000 characters; line breaks kept, each counted as one |
| Video link | `Videolinkki` | Optional; an `https://` address of at most 500 characters |
| Amount | `Määrä` | Either a count, 1–100 times, or a time, 5 seconds to 10 minutes in steps of 5 seconds |
| Duration | `Kesto` | Whole minutes, 1–30 |
| Level | `Taso` | 1, 2 or 3: `Helppo`, `Keskitaso`, `Vaikea` |
| Warm-up | `Sopii lämmittelyyn` | Yes or no, no by default |
| Labels | `Taito`, `Paikka`, `Välineet` | At least one skill and at least one place; only the equipment it needs, which may be none |

An amount is shown as `10 kertaa`, or as a time: `30 s`, `1 min`, `1 min 30 s`.
A duration is shown as `5 min`.

## The labels

Fixed in code. Each has a meaning, which the import and the AI are given too,
so that everyone labels an exercise the same way.

Feature 003 gives the meanings in Finnish, as its import's prompt shows them
to the parent (`specs/003-exercise-import.md`); the code holds those. The
English below is what they translate.

| Group | Label | Apply it when |
|---|---|---|
| **Taito** | Kuljetus | The ball moves with the child: running, turning, speeding up with it close |
| | Harhautus | A feint or a move to get past an opponent |
| | Syöttö | The ball is played accurately to a target, a wall or a person |
| | Laukaus | A hard kick at a goal or a target |
| | Pallonhallinta | Control in a small space: first touch, receiving, juggling |
| | Jalkatyö | A quick, rhythmic foot pattern repeated, as on the ladder |
| | Nopeus | Short sprints, starts and acceleration |
| | Ketteryys | Changing direction, dodging, reacting |
| | Tasapaino | Holding one's body on one leg or in hard positions |
| | Voima | Bodyweight strength |
| | Liikkuvuus | Stretching and joint mobility |
| **Paikka** | Kenttä | Outdoors on a field: room to run and to kick hard |
| | Sisällä | At home indoors: little room, no hard kicks, no jumping |
| | Kuntosali | The building's gym room: room to move and jump, no hard kicks |
| **Välineet** | Pallo | A football, or a soft ball indoors |
| | Tikkaat | An agility ladder |
| | Aidat | Mini hurdles |
| | Kartiot | Cones or markers |
| | Maali | A goal, or a target marked as one |
| | Seinä | A wall or a rebounder to play the ball against |
| | Hyppynaru | A jump rope |

## What the user sees

Addresses are Finnish rows in `src/lib/routes.ts`; folders are English. Every
page below is the trainer side's, behind its unlock.

**The menu**, at `/valmentaja`:

| Where | Text |
|---|---|
| Heading | `Valmentaja` |
| Link to the library | `Harjoitteet` |
| Link to the nickname | `Lapsen nimi` |
| Button that locks and returns to the child's side | `Lukitse ja palaa` |
| Button that signs out | `Kirjaudu ulos` |

**The nickname**, at `/valmentaja/nimi`: Feature 001's form as it is, under the
heading `Lapsen nimi`, with `Takaisin` to the menu.

**The library**, at `/valmentaja/harjoitteet`:

| Where | Text |
|---|---|
| Heading | `Harjoitteet` |
| Link to a new exercise | `Uusi harjoite` |
| Filter group headings | `Taito`, `Paikka`, `Välineet käytössä` |
| Button that applies the filters | `Näytä` |
| The count, after filtering | `‹n› harjoitetta`, or `1 harjoite` |
| Each row | the name, as a link to its page; `Taso ‹Helppo/Keskitaso/Vaikea›`, the amount, the duration; and `Lämmittely` when it suits a warm-up |
| An empty library | `Kirjastossa ei ole vielä harjoitteita.` |
| No exercise fits the filters | `Yksikään harjoite ei sovi valintoihin.` |
| Link back | `Takaisin`, to the menu |

The filters: with no skill ticked, every skill passes, and so with places.
With skills ticked, an exercise passes if it has any of them, and so with
places. `Välineet käytössä` starts with every item ticked; an exercise passes
if every item it needs is ticked, so unticking `Maali` hides those that need a
goal. Groups combine: an exercise has to pass all three. The filters are in
the address, so going back keeps them. Rows are sorted by name in Finnish
alphabetical order, with å, ä and ö after z.

**A new exercise**, at `/valmentaja/harjoitteet/uusi`, and **an exercise**, at
`/valmentaja/harjoitteet/‹id›`: one form.

| Where | Text |
|---|---|
| Heading, new | `Uusi harjoite` |
| Heading, existing | the exercise's name |
| Field labels | as in *The exercise* |
| Amount's choice | `Kertaa` or `Aika`, then a field `Kertoja`, or `Sekuntia` |
| Duration's field | `Kesto (min)` |
| Level's choices | `Helppo`, `Keskitaso`, `Vaikea` |
| Label groups | `Taito`, `Paikka`, `Välineet`, each label a checkbox |
| Button | `Tallenna` |
| After adding | `Lisätty: ‹name›.`, and the form empty again for the next one |
| After saving an existing one | `Tallennettu.` |
| Button on an existing one | `Poista harjoite` |
| Its confirmation | `Poistetaanko harjoite ‹name›?`, with `Poista` and `Peruuta` |
| Link back | `Takaisin`, to the library |

The video link, when there is one, shows as `Katso video` on the exercise's
page, opening in a new tab.

**Refusals**, each beside its field, with nothing saved:

| Case | Text |
|---|---|
| Name of the wrong length | `Nimessä on oltava 1–40 merkkiä.` |
| A name already in the library, whatever its case | `Samanniminen harjoite on jo kirjastossa.` |
| Instructions of the wrong length | `Ohjeessa on oltava 1–1000 merkkiä.` |
| A video link that is not an `https://` address, or over 500 characters | `Videolinkin on oltava https-osoite.` |
| A count outside 1–100 | `Kertoja on oltava 1–100.` |
| A time outside 5–600 seconds, or not in steps of 5 | `Ajan on oltava 5 s – 10 min, 5 sekunnin välein.` |
| A duration outside 1–30 | `Keston on oltava 1–30 minuuttia.` |
| No level | `Valitse taso.` |
| No skill | `Valitse vähintään yksi taito.` |
| No place | `Valitse vähintään yksi paikka.` |

**An address that does not exist**, anywhere in the app, and an exercise's
address whose exercise is gone: `Sivua ei löytynyt.`, with `Etusivulle` to `/`.

A failure the user cannot fix shows the existing error page.

## Data

| Table | Columns | Why |
|---|---|---|
| `exercise` | `id`; `user_id`, references `user`, deleted with it; `name`, text; `instructions`, text; `video_url`, text, nullable; `amount_kind`, `count` or `time`; `amount`, integer: times, or seconds; `duration_minutes`, integer; `level`, integer; `warm_up`, boolean; `created_at`; `updated_at` | The library. Each field's own rule in *The exercise* is a check in the database too; the rule across labels, a skill and a place, and the video link's parse are the app's. The name is unique per parent by its lowercase, by ICU whatever the database's locale |
| `exercise_label` | `exercise_id`, references `exercise`, deleted with it; `label`, text, one of the list's keys; primary key both | The labels. Stored by English keys, such as `dribbling`, with the Finnish names in code; the database refuses any other key |

The library belongs to the parent who made it, as the child's profile does.

**Personal data**: none. An exercise describes training, not the child.

## AI

Not used.

## Edge cases

| Case | Behaviour |
|---|---|
| Two exercises saved with the same name at once | One is saved; the other gets `Samanniminen harjoite on jo kirjastossa.` (the unique index decides) |
| Renaming to the name another exercise has | `Samanniminen harjoite on jo kirjastossa.`; renaming to the same name in another case is allowed |
| Saving an exercise that was deleted meanwhile | `Sivua ei löytynyt.` |
| Two saves of the same exercise at once | The later one wins |
| The same add sent again, as after an answer lost on the way | One exercise, the first; the second gets `Samanniminen harjoite on jo kirjastossa.` |
| A time chosen, then the amount kind changed to count | Only the shown field is sent and checked |
| A label key the server does not know, in a crafted request | Refused with `Valitse vähintään yksi taito.`, as a key on no list belongs to no group; nothing saved |
| An exercise address with an id of another parent's exercise | `Sivua ei löytynyt.`; it is never shown or changed |
| Every equipment item unticked | Only exercises needing nothing |
| The unlock ends while the form is open | The next save goes to the lock page, as in Feature 001; what was typed is lost |
| The database unreachable | The existing error page |

## Logging

Ids only: the user and exercise ids. Never an exercise's text.

| Event | Level | Line |
|---|---|---|
| Exercise added | info | `exercise created: user ‹id›, exercise ‹id›` |
| Exercise saved | info | `exercise updated: user ‹id›, exercise ‹id›` |
| Exercise deleted | info | `exercise deleted: user ‹id›, exercise ‹id›` |
| A refusal for a name already in use | info | `exercise refused, name in use: user ‹id›` |
| A database failure in any of these | error | the event's name, `failed`, the ids, and Postgres's reason, as Feature 001 logs them |

## Security and secrets

- **No new environment variables.**
- **Who may do what**: only the unlocked trainer side, checked on the server
  for every page and action (Feature 001's `requireTrainer`). Every read and
  write of an exercise is limited to the parent's own.

## Acceptance criteria

- [ ] `/valmentaja` shows the menu: `Harjoitteet`, `Lapsen nimi`, `Lukitse ja palaa` and `Kirjaudu ulos`; `Lukitse ja palaa` locks and lands on the child's side
- [ ] `/valmentaja/nimi` saves the nickname as Feature 001 did, and `Takaisin` returns to the menu
- [ ] An exercise is added with every field, and the form empties, saying `Lisätty: ‹name›.`
- [ ] Each refusal in *Refusals* is shown beside its field, and nothing is saved
- [ ] A second exercise named as an existing one, in any case, is refused
- [ ] An exercise is edited and saved, saying `Tallennettu.`, and deleted after `Poistetaanko harjoite ‹name›?`
- [ ] The library lists every exercise in Finnish alphabetical order, with the count, and its two empty messages in their cases
- [ ] The skill, place and equipment filters pass exactly the exercises *What the user sees* describes, and stay in the address
- [ ] An exercise with a video link shows `Katso video`, opening in a new tab
- [ ] An address that does not exist, and another parent's exercise, show `Sivua ei löytynyt.`
- [ ] Every page here goes to the lock page without an unlock, and the child's side links to none of them
- [ ] Every log line in *Logging* is written, with ids only

## Tests

| Level | What |
|---|---|
| Unit | Each field's rule at its boundaries: name 0, 1, 40 and 41 characters; instructions 0, 1, 1000 and 1001; video link absent, `http://`, `https://`, and 500 and 501 characters; count 0, 1, 100 and 101; time 0, 5, 7, 600 and 605 seconds; duration 0, 1, 30 and 31. The amount's and the duration's display; the label list's keys, groups and names; the filters' rules, including no ticks, several ticks and every equipment item unticked; the Finnish sort; each refusal's message |
| Integration, against Postgres | The tables, their checks and deletes; the name's uniqueness by its lowercase, Finnish letters included, with two concurrent saves; a label key the database refuses; one parent's exercises out of another's reach; the log lines |
| End to end | The menu and **Lukitse ja palaa**; adding, editing and deleting an exercise; a refusal; the filters; the not-found page |

## Open questions

None.
