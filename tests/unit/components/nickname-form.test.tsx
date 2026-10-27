import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const saveChildNickname = vi.fn();
vi.mock("@/app/trainer/actions", () => ({
  saveChildNickname: (...args: unknown[]) => saveChildNickname(...args),
}));

const { NicknameForm } = await import("@/components/nickname-form");

beforeEach(() => {
  saveChildNickname.mockReset();
});

afterEach(() => {
  cleanup();
});

const field = () => screen.getByLabelText("Lapsen nimi") as HTMLInputElement;
const save = () => fireEvent.click(screen.getByRole("button", { name: "Tallenna" }));

describe("NicknameForm", () => {
  it("starts from the saved nickname, or empty", () => {
    render(<NicknameForm nickname="Testi" />);
    expect(field().value).toBe("Testi");
    cleanup();
    render(<NicknameForm nickname={null} />);
    expect(field().value).toBe("");
  });

  it("sends the nickname, and says it was saved", async () => {
    saveChildNickname.mockResolvedValue({ message: "Tallennettu.", error: false });
    render(<NicknameForm nickname={null} />);
    fireEvent.change(field(), { target: { value: "Testi" } });
    save();
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("Tallennettu.");
    });
    const [, sent] = saveChildNickname.mock.calls[0] as [unknown, FormData];
    expect(sent.get("nickname")).toBe("Testi");
  });

  it("shows a refusal as an alert", async () => {
    saveChildNickname.mockResolvedValue({
      message: "Nimessä on oltava 1–20 merkkiä.",
      error: true,
    });
    render(<NicknameForm nickname={null} />);
    save();
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Nimessä on oltava 1–20 merkkiä.");
    });
  });
});
