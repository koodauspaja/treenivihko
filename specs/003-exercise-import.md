# 003 — Exercise import

Issue: #36

## Summary

The parent adds many exercises to the library at once, from a JSON file or
from text pasted from an AI tool. Every exercise is checked by the library's
own rules first, and nothing is saved unless all of them pass.

## Scope

**In**

- An import page on the trainer side, reading one JSON list of exercises,
  from a file or from pasted text.
- Every exercise checked by Feature 002's rules, plus the import's own: the
  format, a name used twice in the import, and a name already in the library.
- All or nothing: one failing exercise means nothing is saved, and every
  failing exercise is listed with its reasons.
- A ready Finnish prompt for an AI tool, with the format, the rules and every
  label's meaning, and a button that copies it.
- The labels' meanings in Finnish, replacing Feature 002's English ones, since
  the prompt shows them to the parent.

**Out**

- Export.
- Importing sessions or periods.
- CSV or any format but JSON.
- Changing or replacing an exercise already in the library: an import only adds.
- Calling the Claude API: the parent uses an AI tool of their own.
- Keeping the file: it is read and dropped.

## Who and where

The parent, at home on wifi, on the trainer side, behind its unlock
(Feature 001). The child never reaches any of it.

## The format

One JSON list, `[ … ]`, of 1 to 100 exercises. Each exercise is an object with
these fields, and no others:

| Field | Value | Required | Feature 002's field |
|---|---|---|---|
| `nimi` | text | yes | Name |
| `ohje` | text | yes | Instructions |
| `videolinkki` | text, or `null` | no, `null` if left out | Video link |
| `kertaa` | whole number | exactly one of `kertaa` and `sekuntia` | Amount, as a count |
| `sekuntia` | whole number | exactly one of `kertaa` and `sekuntia` | Amount, as a time |
| `kesto_min` | whole number | yes | Duration |
| `taso` | `1`, `2` or `3` | yes | Level |
| `lammittely` | `true` or `false` | no, `false` if left out | Warm-up |
| `taidot` | list of skill names | yes | Labels, skills |
| `paikat` | list of place names | yes | Labels, places |
| `valineet` | list of equipment names | no, none if left out | Labels, equipment |

- Each value then meets Feature 002's rule for its field: the same trimming,
  lengths, ranges and steps.
- A whole number is a JSON number with no fraction. `"10"`, a text, is not one.
- A label is its Finnish name, as in Feature 002's list. It matches ignoring
  case and the spaces around it, so `jalkatyö` is `Jalkatyö`. A name listed
  twice counts once.
- The file is UTF-8 text, at most 500 KB, with or without a byte order mark.
  Pasted text has the same limit.

Example, as the page shows it:

```json
[
  {
    "nimi": "Tikkaat: perusaskel",
    "ohje": "Kaksi askelta sisään, yksi ulos. Katse ylös.",
    "kertaa": 10,
    "kesto_min": 5,
    "taso": 1,
    "lammittely": true,
    "taidot": ["Jalkatyö"],
    "paikat": ["Kenttä", "Kuntosali"],
    "valineet": ["Tikkaat"]
  }
]
```

## The labels' meanings, in Finnish

They replace Feature 002's English meanings in the label list; the keys and
names stay as they are.

| Group | Label | Merkitys |
|---|---|---|
| **Taito** | Kuljetus | Pallo liikkuu lapsen mukana: juoksu, käännökset ja kiihdytykset pallo lähellä |
| | Harhautus | Harhautus tai liike, jolla ohitetaan vastustaja |
| | Syöttö | Pallo pelataan tarkasti kohteeseen, seinään tai toiselle |
| | Laukaus | Kova potku maaliin tai kohteeseen |
| | Pallonhallinta | Hallinta pienessä tilassa: ensikosketus, vastaanotto, pompottelu |
| | Jalkatyö | Nopea, rytminen askelkuvio toistettuna, kuten tikkailla |
| | Nopeus | Lyhyet spurtit, lähdöt ja kiihdytykset |
| | Ketteryys | Suunnanmuutokset, väistöt ja reagointi |
| | Tasapaino | Kehon hallinta yhdellä jalalla tai vaikeissa asennoissa |
| | Voima | Lihasvoima omalla painolla |
| | Liikkuvuus | Venyttely ja nivelten liikkuvuus |
| **Paikka** | Kenttä | Ulkona kentällä: tilaa juosta ja potkaista kovaa |
| | Sisällä | Kotona sisällä: vähän tilaa, ei kovia potkuja eikä hyppyjä |
| | Kuntosali | Talon kuntosali: tilaa liikkua ja hypätä, ei kovia potkuja |
| **Välineet** | Pallo | Jalkapallo, tai sisällä pehmeä pallo |
| | Tikkaat | Ketteryystikkaat |
| | Aidat | Pienet aidat |
| | Kartiot | Kartiot tai merkit |
| | Maali | Maali, tai maaliksi merkitty kohde |
| | Seinä | Seinä tai palautin, johon pallon voi pelata |
| | Hyppynaru | Hyppynaru |

## What the user sees

**On the library**, `/valmentaja/harjoitteet`: a link `Tuo harjoitteita`,
beside `Uusi harjoite`, to the import page.

**The import page**, at `/valmentaja/harjoitteet/tuonti`:

| Where | Text |
|---|---|
| Heading | `Tuo harjoitteita` |
| Introduction | `Lisää monta harjoitetta kerralla JSON-tiedostosta tai tekoälytyökalun vastauksesta. Jokainen harjoite tarkistetaan ensin, ja jos yksikin ei kelpaa, mitään ei tallenneta.` |
| The prompt's heading | `Ohje tekoälylle` |
| The prompt's introduction | `Kopioi tämä ohje tekoälytyökaluun ja kerro perään, millaisia harjoitteita haluat.` |
| The prompt | the text in *The prompt*, below, in a read-only box |
| Its button | `Kopioi ohje` |
| After copying | `Kopioitu.` |
| When copying fails | `Kopiointi ei onnistunut. Valitse teksti ja kopioi se itse.` |
| The form's heading | `Tuonti` |
| The file's field | `Tiedosto (.json)` |
| The text's field | `Tai liitä teksti` |
| Button | `Tuo` |
| After an import | `Tuotu ‹n› harjoitetta.`, or `Tuotu 1 harjoite.`, and the form empty again |
| Link back | `Takaisin`, to the library |

**The prompt**, exactly:

```text
Tee jalkapallo- ja liikuntaharjoitteita lapselle, joka harjoittelee yksin. Vastaa pelkällä JSON-listalla, ilman muuta tekstiä ennen tai jälkeen. Listassa saa olla enintään 100 harjoitetta. Jokainen harjoite on olio, jossa on vain nämä kentät:

- "nimi": lyhyt, helposti muistettava ja kirjoitettava nimi, 1–40 merkkiä. Jokaisella harjoitteella on eri nimi.
- "ohje": miten harjoite tehdään, 1–1000 merkkiä.
- "videolinkki": https-osoite, enintään 500 merkkiä, tai null.
- joko "kertaa": toistojen määrä, kokonaisluku 1–100, tai "sekuntia": aika, kokonaisluku 5–600, 5 sekunnin välein. Ei molempia.
- "kesto_min": kesto minuutteina, kokonaisluku 1–30.
- "taso": 1 (helppo), 2 (keskitaso) tai 3 (vaikea).
- "lammittely": true, jos harjoite sopii lämmittelyyn, muuten false.
- "taidot": lista, jossa on vähintään yksi alla olevista taidoista.
- "paikat": lista, jossa on vähintään yksi alla olevista paikoista.
- "valineet": lista harjoitteen tarvitsemista välineistä alla olevista, tai tyhjä lista.

Käytä taitojen, paikkojen ja välineiden nimiä täsmälleen näin:

Taidot:
‹each skill: "- ‹name›: ‹meaning›", one per line, in the list's order›

Paikat:
‹each place, likewise›

Välineet:
‹each equipment item, likewise›
```

The lines in `‹ ›` are filled from the label list, so the prompt always names
exactly the labels the import accepts.

**Refusals of the whole import**, above the form, with nothing saved:

| Case | Text |
|---|---|
| Neither a file nor text | `Valitse tiedosto tai liitä teksti.` |
| Both a file and text | `Valitse tiedosto tai liitä teksti, ei molempia.` |
| Over 500 KB | `Tuonti on liian suuri: enintään 500 kt.` |
| Not UTF-8 text | `Tiedoston on oltava UTF-8-tekstiä.` |
| Not JSON | `Tämä ei ole JSON-muotoa.` |
| JSON, but not a list | `Tuonnissa on oltava lista harjoitteita: [ … ].` |
| An empty list | `Tuonnissa ei ole yhtään harjoitetta.` |
| Over 100 exercises | `Tuonnissa saa olla enintään 100 harjoitetta.` |

**Refusals of exercises**: when the import is a list but any exercise in it
fails, the page says, above the form, `‹n› harjoitetta ei kelpaa. Mitään ei
tallennettu.`, or `1 harjoite ei kelpaa. Mitään ei tallennettu.`, then lists
each failing exercise in the import's order: `Harjoite ‹position›: ‹name›`, or
`Harjoite ‹position›` when it has no name that is text, with each of its
reasons under it. The position counts from 1. What was pasted stays in the
text field; a chosen file has to be chosen again, as browsers allow.

| Case | Reason |
|---|---|
| Not an object | `Harjoite ei ole oikeaa muotoa.` |
| A field not in *The format* | `Tuntematon kenttä: ‹field›.` |
| A field's value of the wrong type, missing, or breaking Feature 002's rule | Feature 002's refusal for that field, such as `Nimessä on oltava 1–40 merkkiä.` or `Valitse taso.` |
| Both `kertaa` and `sekuntia`, or neither | `Anna joko kertaa tai sekuntia, ei molempia.` |
| `lammittely` not `true` or `false` | `Lämmittelyn on oltava true tai false.` |
| A label list that is not a list of texts | `‹Taidot/Paikat/Välineet› on annettava listana.` |
| A label name not on the list, or in another group | `Tuntematon taito: ‹name›.`, `Tuntematon paikka: ‹name›.` or `Tuntematon väline: ‹name›.` |
| A name already in the library, whatever its case | `Samanniminen harjoite on jo kirjastossa.` |
| A name used by an earlier exercise in the import, whatever its case | `Sama nimi on jo aiemmin tuonnissa.` |

An exercise with no skill or no place, or an empty `taidot` or `paikat`, gets
Feature 002's `Valitse vähintään yksi taito.` or `Valitse vähintään yksi
paikka.`

## Data

No new tables. Imported exercises are rows in Feature 002's `exercise` and
`exercise_label`, the same as exercises added by hand, saved in one
transaction. The file and the pasted text are read and dropped, never stored
or logged.

The labels' meanings, in code, become Finnish.

**Personal data**: none. An exercise describes training, not the child.

## AI

The app calls no AI. The parent may write the import with an AI tool of their
own; what it writes reaches the library only by the parent importing it, and
only after passing every rule an exercise added by hand passes. Nothing here
reaches the child.

## Edge cases

| Case | Behaviour |
|---|---|
| An exercise saved with a name in the import, between the check and the save | Nothing saved; `Kirjastoon tallennettiin samanniminen harjoite tuonnin aikana. Mitään ei tallennettu; tuo uudelleen.` (the unique index decides) |
| The same import sent again, as after an answer lost on the way | Every exercise gets `Samanniminen harjoite on jo kirjastossa.`; nothing saved twice |
| An import of 101 exercises, all valid | `Tuonnissa saa olla enintään 100 harjoitetta.`; no exercise is checked |
| A text value surrounded by spaces, or instructions with `\r\n` | Trimmed and counted as Feature 002 does |
| JSON with a comment, or a trailing comma | `Tämä ei ole JSON-muotoa.` |
| The AI tool's answer wrapped in ```` ```json ```` fences, or with text around it | `Tämä ei ole JSON-muotoa.` |
| A label name with other case or spaces around it | Accepted, as its name on the list |
| An exercise using `Tikkaat` as a skill | `Tuntematon taito: Tikkaat.` |
| `"taso": 2.0`, `"kertaa": "10"` | Feature 002's refusal for that field |
| The unlock ends while the page is open | The next import goes to the lock page, as in Feature 001; what was pasted is lost |
| The database unreachable | The existing error page |

## Logging

Ids and counts only. Never an exercise's text, the file or the pasted text.

| Event | Level | Line |
|---|---|---|
| An import saved | info | `exercises imported: user ‹id›, ‹n› exercises` |
| An import refused as a whole | info | `exercise import refused: user ‹id›, ‹reason›`, the reason one of `empty`, `both`, `size`, `encoding`, `json`, `shape`, `none`, `count` |
| An import refused for its exercises | info | `exercise import refused: user ‹id›, ‹n› of ‹m› exercises failing` |
| A name saved meanwhile | info | `exercise import refused, name in use: user ‹id›` |
| A database failure | error | the event's name, `failed`, the ids, and Postgres's reason, as Feature 001 logs them |

## Security and secrets

- **No new environment variables.**
- **Who may do what**: only the unlocked trainer side, checked on the server
  for the page and its action (Feature 001's `requireTrainer`). Exercises are
  added to the parent's own library only.
- **Size**: the 500 KB limit is checked on the server before the text is
  parsed. It is under the 1 MB Next allows a server action's body by default.

## Acceptance criteria

- [ ] The library links to `/valmentaja/harjoitteet/tuonti` with `Tuo harjoitteita`
- [ ] The import page shows the prompt in *The prompt*, naming every label with its Finnish meaning, and `Kopioi ohje` copies it, saying `Kopioitu.`
- [ ] A valid file of 3 exercises is imported, saying `Tuotu 3 harjoitetta.`, and they are in the library with every field and label as the file gave them
- [ ] The same exercises, pasted as text, are imported the same way
- [ ] Each refusal of the whole import in *What the user sees* is shown, and nothing is saved
- [ ] An import with one failing exercise among valid ones saves nothing, and names the failing exercise by position and name with each of its reasons
- [ ] A name already in the library, and a name used twice in the import, in any case, are refused as *What the user sees* says
- [ ] Labels match by Finnish name, ignoring case and spaces around them, and an unknown or wrong-group name is refused by name
- [ ] The labels' meanings are Finnish wherever the label list gives them
- [ ] The import page goes to the lock page without an unlock, and its action saves nothing without one
- [ ] Every log line in *Logging* is written, with ids and counts only

## Tests

| Level | What |
|---|---|
| Unit | The format: each field present, missing, of the wrong type, and at Feature 002's boundaries; `kertaa` and `sekuntia` both, neither and each; an unknown field; a label in another case, with spaces, unknown, in the wrong group and listed twice; `null` and absent `videolinkki` and `lammittely`; whole numbers against `2.0` and `"10"`. The whole import: neither input, both, 500 KB and 500 KB plus one byte, a byte order mark, invalid UTF-8, invalid JSON, an object, an empty list, 100 and 101 exercises. Names used twice in the import, and already in the library, in other cases. The prompt naming every label in the list's order. Each refusal's text, and the counts' singular and plural |
| Integration, against Postgres | An import saved in one transaction, every field and label read back; a name saved meanwhile refusing the whole import and saving nothing; the import within the parent's own library; the log lines |
| End to end | The link from the library; importing a file and pasted text; a refused exercise listed by position and name; copying the prompt; the lock page without an unlock |

## Open questions

None. The prompt's wording may be revised once it has been used with an AI
tool; a revision changes only its text, not the format it asks for.
