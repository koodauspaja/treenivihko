import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VideoLink } from "@/components/video-link";

afterEach(() => {
  cleanup();
});

describe("VideoLink", () => {
  it("opens the video in a new tab that gets neither the page nor its address", () => {
    render(<VideoLink url="https://example.com/video" />);
    const link = screen.getByRole("link", { name: "Katso video" });
    expect(link.getAttribute("href")).toBe("https://example.com/video");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("shows nothing without a video", () => {
    const { container } = render(<VideoLink url={null} />);
    expect(container.textContent).toBe("");
  });
});
