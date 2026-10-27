import { describe, expect, it } from "vitest";
import {
  IMPORT_MAX_BYTES,
  IMPORT_MAX_EXERCISES,
  importText,
  readImport,
} from "@/lib/exercises/import";

const VALID = {
  nimi: "Tikkaat: perusaskel",
  ohje: "Kaksi askelta sisään, yksi ulos.",
  kertaa: 10,
  kesto_min: 5,
  taso: 1,
  lammittely: true,
  taidot: ["Jalkatyö"],
  paikat: ["Kenttä", "Kuntosali"],
  valineet: ["Tikkaat"],
};

const read = (items: unknown, library: string[] = []) => readImport(JSON.stringify(items), library);

/** The reasons the import's only exercise fails, or null when it passes. */
const reasonsOf = (exercise: unknown, library: string[] = []) => {
  const reading = read([exercise], library);
  if (reading.ok) {
    return null;
  }
  if ("refusal" in reading) {
    throw new Error(`refused as a whole: ${reading.refusal}`);
  }
  return reading.failing[0]?.reasons;
};

const without = (field: keyof typeof VALID) => {
  const { [field]: _, ...rest } = VALID;
  return rest;
};

describe("importText", () => {
  const bytes = (text: string) => new TextEncoder().encode(text);

  it("takes a file or pasted text, exactly one of the two", () => {
    expect(importText(null, "")).toEqual({ ok: false, refusal: "empty" });
    expect(importText(null, "  \n ")).toEqual({ ok: false, refusal: "empty" });
    expect(importText(bytes("[]"), "[]")).toEqual({ ok: false, refusal: "both" });
    expect(importText(bytes("[1]"), "")).toEqual({ ok: true, text: "[1]" });
    expect(importText(null, "[2]")).toEqual({ ok: true, text: "[2]" });
  });

  it("takes 500 kt, from a file or pasted, and not a byte more", () => {
    const most = "x".repeat(IMPORT_MAX_BYTES);
    expect(IMPORT_MAX_BYTES).toBe(500_000);
    expect(importText(bytes(most), "").ok).toBe(true);
    expect(importText(bytes(`${most}x`), "")).toEqual({ ok: false, refusal: "size" });
    expect(importText(null, most).ok).toBe(true);
    expect(importText(null, `${most}x`)).toEqual({ ok: false, refusal: "size" });
    // Counted in bytes as sent: ä is two.
    expect(importText(null, "ä".repeat(IMPORT_MAX_BYTES / 2 + 1))).toEqual({
      ok: false,
      refusal: "size",
    });
  });

  it("drops a byte order mark, and refuses a file that is not UTF-8", () => {
    expect(importText(new Uint8Array([0xef, 0xbb, 0xbf, 0x5b, 0x5d]), "")).toEqual({
      ok: true,
      text: "[]",
    });
    expect(importText(null, "\uFEFF[]")).toEqual({ ok: true, text: "[]" });
    expect(importText(new Uint8Array([0x5b, 0xff, 0x5d]), "")).toEqual({
      ok: false,
      refusal: "encoding",
    });
  });
});

describe("readImport, as a whole", () => {
  it("refuses what is not one JSON list of 1 to 100 exercises", () => {
    expect(readImport("[1,]", [])).toEqual({ ok: false, refusal: "json" });
    expect(readImport("// lista\n[]", [])).toEqual({ ok: false, refusal: "json" });
    expect(readImport("```json\n[]\n```", [])).toEqual({ ok: false, refusal: "json" });
    expect(read(VALID)).toEqual({ ok: false, refusal: "shape" });
    expect(read([])).toEqual({ ok: false, refusal: "none" });
    const named = (count: number) =>
      Array.from({ length: count }, (_, index) => ({ ...VALID, nimi: `Harjoite ${index}` }));
    expect(IMPORT_MAX_EXERCISES).toBe(100);
    expect(read(named(100)).ok).toBe(true);
    expect(read(named(101))).toEqual({ ok: false, refusal: "count" });
  });

  it("gives every exercise checked, as Feature 002's rules make it", () => {
    const reading = read([VALID, { ...without("kertaa"), nimi: "Hyppy", sekuntia: 30 }]);
    if (!reading.ok) {
      throw new Error("the import is valid");
    }
    expect(reading.exercises).toEqual([
      {
        name: "Tikkaat: perusaskel",
        instructions: "Kaksi askelta sisään, yksi ulos.",
        videoUrl: null,
        amountKind: "count",
        amount: 10,
        durationMinutes: 5,
        level: 1,
        warmUp: true,
        labels: ["footwork", "field", "gym", "ladder"],
      },
      expect.objectContaining({ name: "Hyppy", amountKind: "time", amount: 30 }),
    ]);
    expect(Object.isFrozen(reading.exercises[0])).toBe(true);
  });

  it("saves nothing when one fails, and names each failing one by position and name", () => {
    const reading = read([VALID, { ...VALID, nimi: "Toinen", taso: 4 }, 7, { ...VALID, nimi: "" }]);
    expect(reading).toEqual({
      ok: false,
      total: 4,
      failing: [
        { position: 2, name: "Toinen", reasons: ["Valitse taso."] },
        { position: 3, name: null, reasons: ["Harjoite ei ole oikeaa muotoa."] },
        { position: 4, name: null, reasons: ["Nimessä on oltava 1–40 merkkiä."] },
      ],
    });
  });
});

describe("readImport, an exercise's fields", () => {
  it("passes the example exercise", () => {
    expect(reasonsOf(VALID)).toBeNull();
  });

  it("refuses a field not in the format, so a typo cannot drop a value", () => {
    expect(reasonsOf({ ...without("valineet"), välineet: ["Tikkaat"] })).toEqual([
      "Tuntematon kenttä: välineet.",
    ]);
  });

  it("needs each required field, refused by Feature 002's message", () => {
    expect(reasonsOf(without("nimi"))).toEqual(["Nimessä on oltava 1–40 merkkiä."]);
    expect(reasonsOf(without("ohje"))).toEqual(["Ohjeessa on oltava 1–1000 merkkiä."]);
    expect(reasonsOf(without("kesto_min"))).toEqual(["Keston on oltava 1–30 minuuttia."]);
    expect(reasonsOf(without("taso"))).toEqual(["Valitse taso."]);
    expect(reasonsOf(without("taidot"))).toEqual(["Valitse vähintään yksi taito."]);
    expect(reasonsOf(without("paikat"))).toEqual(["Valitse vähintään yksi paikka."]);
  });

  it("leaves out a video link, a warm-up and equipment as none, no and none", () => {
    const reading = read([without("lammittely")]);
    expect(reading.ok && reading.exercises[0]?.warmUp).toBe(false);
    const bare = read([{ ...without("valineet"), videolinkki: null }]);
    expect(bare.ok && bare.exercises[0]).toMatchObject({
      videoUrl: null,
      labels: ["footwork", "field", "gym"],
    });
  });

  it("holds each value to Feature 002's rule, trimmed and counted as there", () => {
    expect(reasonsOf({ ...VALID, nimi: "x".repeat(40) })).toBeNull();
    expect(reasonsOf({ ...VALID, nimi: "x".repeat(41) })).toEqual([
      "Nimessä on oltava 1–40 merkkiä.",
    ]);
    const spaced = read([{ ...VALID, nimi: "  Tikkaat  ", ohje: "Yksi\r\nkaksi " }]);
    expect(spaced.ok && spaced.exercises[0]).toMatchObject({
      name: "Tikkaat",
      instructions: "Yksi\nkaksi",
    });
    expect(reasonsOf({ ...VALID, videolinkki: "http://example.com" })).toEqual([
      "Videolinkin on oltava https-osoite.",
    ]);
    expect(reasonsOf({ ...VALID, kertaa: 101 })).toEqual(["Kertoja on oltava 1–100."]);
    expect(reasonsOf({ ...without("kertaa"), sekuntia: 7 })).toEqual([
      "Ajan on oltava 5 s – 10 min, 5 sekunnin välein.",
    ]);
    expect(reasonsOf({ ...VALID, kesto_min: 31 })).toEqual(["Keston on oltava 1–30 minuuttia."]);
  });

  it("takes a whole number only as a JSON number in digits", () => {
    expect(reasonsOf({ ...VALID, kertaa: "10" })).toEqual(["Kertoja on oltava 1–100."]);
    expect(readImport(JSON.stringify([VALID]).replace('"taso":1', '"taso":1.0'), [])).toEqual({
      ok: false,
      total: 1,
      failing: [{ position: 1, name: VALID.nimi, reasons: ["Valitse taso."] }],
    });
    expect(readImport(JSON.stringify([VALID]).replace('"kertaa":10', '"kertaa":1e1'), [])).toEqual({
      ok: false,
      total: 1,
      failing: [expect.objectContaining({ reasons: ["Kertoja on oltava 1–100."] })],
    });
    expect(reasonsOf({ ...VALID, kesto_min: -5 })).toEqual(["Keston on oltava 1–30 minuuttia."]);
  });

  it("needs exactly one of kertaa and sekuntia", () => {
    const both = "Anna joko kertaa tai sekuntia, ei molempia.";
    expect(reasonsOf({ ...VALID, sekuntia: 30 })).toEqual([both]);
    expect(reasonsOf(without("kertaa"))).toEqual([both]);
    expect(reasonsOf({ ...without("kertaa"), sekuntia: 30 })).toBeNull();
  });

  it("refuses a value of the wrong type in the fields Feature 002 never sees as such", () => {
    expect(reasonsOf({ ...VALID, videolinkki: 5 })).toEqual([
      "Videolinkin on oltava https-osoite.",
    ]);
    expect(reasonsOf({ ...VALID, lammittely: "kyllä" })).toEqual([
      "Lämmittelyn on oltava true tai false.",
    ]);
    expect(reasonsOf({ ...VALID, lammittely: null })).toEqual([
      "Lämmittelyn on oltava true tai false.",
    ]);
    expect(reasonsOf({ ...VALID, nimi: 5 })).toEqual(["Nimessä on oltava 1–40 merkkiä."]);
  });

  it("lists every reason an exercise fails, in the fields' order", () => {
    expect(
      reasonsOf({
        hauskuus: 1,
        nimi: "",
        ohje: "",
        kertaa: 0,
        kesto_min: 0,
        taso: 0,
        taidot: [],
        paikat: [],
      })
    ).toEqual([
      "Tuntematon kenttä: hauskuus.",
      "Nimessä on oltava 1–40 merkkiä.",
      "Ohjeessa on oltava 1–1000 merkkiä.",
      "Kertoja on oltava 1–100.",
      "Keston on oltava 1–30 minuuttia.",
      "Valitse taso.",
      "Valitse vähintään yksi taito.",
      "Valitse vähintään yksi paikka.",
    ]);
  });
});

describe("readImport, labels", () => {
  it("matches a Finnish name ignoring case and the spaces around it, and counts one listed twice once", () => {
    const reading = read([{ ...VALID, taidot: [" jalkatyö ", "JALKATYÖ", "Nopeus"] }]);
    expect(reading.ok && reading.exercises[0]?.labels).toEqual([
      "footwork",
      "speed",
      "field",
      "gym",
      "ladder",
    ]);
  });

  it("refuses a name not on the list, or in another group, by its name and group", () => {
    expect(reasonsOf({ ...VALID, taidot: ["Tikkaat", "Jalkatyö"] })).toEqual([
      "Tuntematon taito: Tikkaat.",
    ]);
    expect(reasonsOf({ ...VALID, paikat: ["Ranta"] })).toEqual([
      "Tuntematon paikka: Ranta.",
      "Valitse vähintään yksi paikka.",
    ]);
    expect(reasonsOf({ ...VALID, valineet: ["Mailat", "Mailat"] })).toEqual([
      "Tuntematon väline: Mailat.",
    ]);
  });

  it("needs each group as a list of texts", () => {
    expect(reasonsOf({ ...VALID, taidot: "Jalkatyö" })).toEqual([
      "Taidot on annettava listana.",
      "Valitse vähintään yksi taito.",
    ]);
    expect(reasonsOf({ ...VALID, paikat: [1] })).toEqual([
      "Paikat on annettava listana.",
      "Valitse vähintään yksi paikka.",
    ]);
    expect(reasonsOf({ ...VALID, valineet: null })).toEqual(["Välineet on annettava listana."]);
  });
});

describe("readImport, names", () => {
  it("refuses a name already in the library, whatever its case", () => {
    expect(reasonsOf(VALID, ["TIKKAAT: PERUSASKEL"])).toEqual([
      "Samanniminen harjoite on jo kirjastossa.",
    ]);
    expect(reasonsOf({ ...VALID, nimi: "Äijä" }, ["äIJÄ"])).toEqual([
      "Samanniminen harjoite on jo kirjastossa.",
    ]);
  });

  it("refuses a name an earlier exercise of the import has, whatever its case, and keeps the first", () => {
    const reading = read([VALID, { ...VALID, nimi: " tikkaat: PERUSASKEL", taso: 4 }]);
    expect(reading).toEqual({
      ok: false,
      total: 2,
      failing: [
        {
          position: 2,
          name: "tikkaat: PERUSASKEL",
          reasons: ["Sama nimi on jo aiemmin tuonnissa.", "Valitse taso."],
        },
      ],
    });
  });

  it("checks no name that breaks its own rule against the others", () => {
    const long = "x".repeat(41);
    expect(
      read(
        [
          { ...VALID, nimi: long },
          { ...VALID, nimi: long },
        ],
        [long]
      )
    ).toMatchObject({
      failing: [
        { reasons: ["Nimessä on oltava 1–40 merkkiä."] },
        { reasons: ["Nimessä on oltava 1–40 merkkiä."] },
      ],
    });
  });
});
