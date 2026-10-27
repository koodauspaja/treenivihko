import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const { TrainerTimeout } = await import("@/components/trainer-timeout");

const NOW = new Date("2026-10-27T12:00:00.000Z");
const later = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  replace.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TrainerTimeout", () => {
  it("goes to the child's side when the unlock ends, and not before", () => {
    render(<TrainerTimeout expiresAt={later(15 * 60_000)} />);
    vi.advanceTimersByTime(15 * 60_000 - 1);
    expect(replace).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("waits for the new end when the unlock is moved on", () => {
    const { rerender } = render(<TrainerTimeout expiresAt={later(60_000)} />);
    rerender(<TrainerTimeout expiresAt={later(15 * 60_000)} />);
    vi.advanceTimersByTime(60_000);
    expect(replace).not.toHaveBeenCalled();
    vi.advanceTimersByTime(14 * 60_000);
    expect(replace).toHaveBeenCalledOnce();
  });

  it("leaves at once for an end already past, and never after it is gone", () => {
    const { unmount } = render(<TrainerTimeout expiresAt={later(-1_000)} />);
    vi.advanceTimersByTime(0);
    expect(replace).toHaveBeenCalledOnce();
    unmount();
    render(<TrainerTimeout expiresAt={later(1_000)} />).unmount();
    vi.advanceTimersByTime(2_000);
    expect(replace).toHaveBeenCalledOnce();
  });
});
