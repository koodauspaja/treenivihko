import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RootLayout, { metadata } from "@/app/layout";

describe("the root layout", () => {
  it("marks the document as Finnish and renders its children", () => {
    const html = renderToStaticMarkup(
      <RootLayout params={Promise.resolve({})}>
        <p>sisältö</p>
      </RootLayout>
    );
    expect(html).toContain('<html lang="fi">');
    expect(html).toContain("<p>sisältö</p>");
  });

  it("names the app in Finnish", () => {
    expect(metadata).toEqual({
      title: "Treenivihko",
      description: "Omat treenit, vihkoon ja kentälle.",
    });
  });
});
