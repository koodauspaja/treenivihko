import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const seen = vi.fn();
vi.mock("@/components/session-views", () => ({
  SessionView: ({ id }: { id: Promise<string> }) => {
    seen(id);
    return <p>the session</p>;
  },
}));

const { default: SessionPage } = await import("@/app/trainer/sessions/[id]/page");

afterEach(() => {
  cleanup();
});

describe("a session's page", () => {
  it("shows the session by its id", async () => {
    render(
      <SessionPage params={Promise.resolve({ id: "t1" })} searchParams={Promise.resolve({})} />
    );
    expect(screen.getByText("the session")).toBeDefined();
    expect(await seen.mock.calls[0]?.[0]).toBe("t1");
  });
});
