import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const seen = vi.fn();
vi.mock("@/components/marks", () => ({
  MarkView: ({ id }: { id: Promise<string> }) => {
    seen(id);
    return <p>the mark</p>;
  },
}));

const { default: MarkPage } = await import("@/app/session/[id]/page");

afterEach(() => {
  cleanup();
});

describe("a session's marking page", () => {
  it("marks the session by its id", async () => {
    render(<MarkPage params={Promise.resolve({ id: "t1" })} searchParams={Promise.resolve({})} />);
    expect(screen.getByText("the mark")).toBeDefined();
    expect(await seen.mock.calls[0]?.[0]).toBe("t1");
  });
});
