import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingState } from "./LoadingState";

describe("LoadingState", () => {
  it("renders VirtualList wrappers and delegates to LoadingSpinner", () => {
    render(<LoadingState />);

    // Layout wrappers are present for VirtualList integration
    const container = document.querySelector(".virtual-list-container") as HTMLElement;
    const loading = document.querySelector(".virtual-list-loading") as HTMLElement;
    expect(container).toBeInTheDocument();
    expect(loading).toBeInTheDocument();
    expect(container).toContainElement(loading);

    // LoadingSpinner markup is rendered inside wrappers
    const content = document.querySelector(".loading-content") as HTMLElement;
    const spinner = document.querySelector(".loading-spinner") as HTMLElement;
    expect(content).toBeInTheDocument();
    expect(spinner).toBeInTheDocument();
    expect(loading).toContainElement(content);
    expect(content).toContainElement(spinner);

    // Fixed copy is rendered
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("Loading");
    const message = heading.nextElementSibling;
    expect(message).toHaveTextContent("Loading notes...");
  });
});
