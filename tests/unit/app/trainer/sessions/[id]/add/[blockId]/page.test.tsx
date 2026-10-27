import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const seen = vi.fn();
vi.mock("@/components/session-views", () => ({
  ExercisePicker: ({
    sessionId,
    blockId,
  }: {
    sessionId: Promise<string>;
    blockId: Promise<string>;
  }) => {
    seen(sessionId, blockId);
    return <p>the picker</p>;
  },
}));

const { default: PickerPage } = await import("@/app/trainer/sessions/[id]/add/[blockId]/page");

afterEach(() => {
  cleanup();
});

describe("the picker's page", () => {
  it("shows the picker for the session and the block by their ids", async () => {
    render(
      <PickerPage
        params={Promise.resolve({ id: "t1", blockId: "b1" })}
        searchParams={Promise.resolve({})}
      />
    );
    expect(screen.getByText("the picker")).toBeDefined();
    const [sessionId, blockId] = seen.mock.calls[0] as [Promise<string>, Promise<string>];
    expect([await sessionId, await blockId]).toEqual(["t1", "b1"]);
  });
});
