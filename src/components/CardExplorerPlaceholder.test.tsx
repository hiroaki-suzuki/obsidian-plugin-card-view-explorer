import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { describe, expect, it } from "vitest";
import type CardExplorerPlugin from "../main";
import { CardExplorerPlaceholder } from "./CardExplorerPlaceholder";

describe("CardExplorerPlaceholder", () => {
  const createMockPlugin = (autoStart: boolean): CardExplorerPlugin =>
    ({
      settings: {
        autoStart,
        sortKey: "updated",
        showInSidebar: false,
      },
    }) as CardExplorerPlugin;

  it("should render placeholder content", () => {
    const mockPlugin = createMockPlugin(false);
    render(<CardExplorerPlaceholder plugin={mockPlugin} />);

    expect(screen.getByText("Card Explorer")).toBeInTheDocument();
    expect(screen.getByText("React components are ready to be mounted.")).toBeInTheDocument();
    expect(
      screen.getByText("Main CardView component will be implemented in upcoming tasks.")
    ).toBeInTheDocument();
  });

  it("should show auto-start disabled when setting is false", () => {
    const mockPlugin = createMockPlugin(false);
    render(<CardExplorerPlaceholder plugin={mockPlugin} />);

    expect(
      screen.getByText(/Plugin loaded with settings: Auto-start disabled/)
    ).toBeInTheDocument();
  });

  it("should show auto-start enabled when setting is true", () => {
    const mockPlugin = createMockPlugin(true);
    render(<CardExplorerPlaceholder plugin={mockPlugin} />);

    expect(screen.getByText(/Plugin loaded with settings: Auto-start enabled/)).toBeInTheDocument();
  });

  it("should have proper styling structure", () => {
    const mockPlugin = createMockPlugin(false);
    const { container } = render(<CardExplorerPlaceholder plugin={mockPlugin} />);

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveStyle({
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      padding: "20px",
      textAlign: "center",
      color: "var(--text-muted)",
    });
  });

  it("should render all expected elements", () => {
    const mockPlugin = createMockPlugin(true);
    render(<CardExplorerPlaceholder plugin={mockPlugin} />);

    // Check for heading
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("Card Explorer");

    // Check for paragraphs
    const paragraphs = screen.getAllByText(/React components|Main CardView/);
    expect(paragraphs).toHaveLength(2);

    // Check for small element with settings info
    const settingsInfo = screen.getByText(/Plugin loaded with settings/);
    expect(settingsInfo.tagName.toLowerCase()).toBe("small");
  });

  it("should handle plugin with undefined settings gracefully", () => {
    const mockPlugin = {
      settings: undefined,
    } as any as CardExplorerPlugin;

    // This should not throw an error
    expect(() => {
      render(<CardExplorerPlaceholder plugin={mockPlugin} />);
    }).not.toThrow();
  });

  it("should be accessible", () => {
    const mockPlugin = createMockPlugin(false);
    render(<CardExplorerPlaceholder plugin={mockPlugin} />);

    // Check that the main heading is accessible
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toBeInTheDocument();

    // Check that text content is readable
    expect(screen.getByText("Card Explorer")).toBeVisible();
    expect(screen.getByText("React components are ready to be mounted.")).toBeVisible();
  });
});
