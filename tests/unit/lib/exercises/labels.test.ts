import { describe, expect, it } from "vitest";
import { LABEL_KEYS, LABELS, labelOf, labelsIn } from "@/lib/exercises/labels";

describe("the label list", () => {
  it("has 11 skills, 3 places and 7 equipment items, each key once", () => {
    expect(labelsIn("skill").map((label) => label.name)).toEqual([
      "Kuljetus",
      "Harhautus",
      "Syöttö",
      "Laukaus",
      "Pallonhallinta",
      "Jalkatyö",
      "Nopeus",
      "Ketteryys",
      "Tasapaino",
      "Voima",
      "Liikkuvuus",
    ]);
    expect(labelsIn("place").map((label) => label.name)).toEqual([
      "Kenttä",
      "Sisällä",
      "Kuntosali",
    ]);
    expect(labelsIn("equipment").map((label) => label.name)).toEqual([
      "Pallo",
      "Tikkaat",
      "Aidat",
      "Kartiot",
      "Maali",
      "Seinä",
      "Hyppynaru",
    ]);
    expect(new Set(LABEL_KEYS).size).toBe(21);
    expect(LABELS.every((label) => /^[a-z_]+$/.test(label.key) && label.meaning.length > 0)).toBe(
      true
    );
  });

  it("gives each label its meaning in Finnish, word for word as the spec's table", () => {
    expect(LABELS.map((label) => [label.name, label.meaning])).toEqual([
      ["Kuljetus", "Pallo liikkuu lapsen mukana: juoksu, käännökset ja kiihdytykset pallo lähellä"],
      ["Harhautus", "Harhautus tai liike, jolla ohitetaan vastustaja"],
      ["Syöttö", "Pallo pelataan tarkasti kohteeseen, seinään tai toiselle"],
      ["Laukaus", "Kova potku maaliin tai kohteeseen"],
      ["Pallonhallinta", "Hallinta pienessä tilassa: ensikosketus, vastaanotto, pompottelu"],
      ["Jalkatyö", "Nopea, rytminen askelkuvio toistettuna, kuten tikkailla"],
      ["Nopeus", "Lyhyet spurtit, lähdöt ja kiihdytykset"],
      ["Ketteryys", "Suunnanmuutokset, väistöt ja reagointi"],
      ["Tasapaino", "Kehon hallinta yhdellä jalalla tai vaikeissa asennoissa"],
      ["Voima", "Lihasvoima omalla painolla"],
      ["Liikkuvuus", "Venyttely ja nivelten liikkuvuus"],
      ["Kenttä", "Ulkona kentällä: tilaa juosta ja potkaista kovaa"],
      ["Sisällä", "Kotona sisällä: vähän tilaa, ei kovia potkuja eikä hyppyjä"],
      ["Kuntosali", "Talon kuntosali: tilaa liikkua ja hypätä, ei kovia potkuja"],
      ["Pallo", "Jalkapallo, tai sisällä pehmeä pallo"],
      ["Tikkaat", "Ketteryystikkaat"],
      ["Aidat", "Pienet aidat"],
      ["Kartiot", "Kartiot tai merkit"],
      ["Maali", "Maali, tai maaliksi merkitty kohde"],
      ["Seinä", "Seinä tai palautin, johon pallon voi pelata"],
      ["Hyppynaru", "Hyppynaru"],
    ]);
  });

  it("finds a label by key, and none for a key not on the list", () => {
    expect(labelOf("goal")).toMatchObject({ group: "equipment", name: "Maali" });
    expect(labelOf("heading")).toBeUndefined();
  });
});
