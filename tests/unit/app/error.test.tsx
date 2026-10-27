import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ErrorPage from "@/app/error";

describe("the error page", () => {
  it("says something went wrong in Finnish, and retries on request", () => {
    const retry = vi.fn();
    render(<ErrorPage retry={retry} />);
    expect(screen.getByRole("alert").textContent).toBe("Jokin meni vikaan.");
    fireEvent.click(screen.getByRole("button", { name: "Yritä uudelleen" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
