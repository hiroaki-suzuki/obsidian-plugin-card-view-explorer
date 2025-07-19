import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { describe, expect, it } from "vitest";
import { LoadingSpinner } from "./LoadingSpinner";

describe("LoadingSpinner", () => {
  it("renders with default props", () => {
    render(<LoadingSpinner />);

    expect(screen.getByText("Loading")).toBeInTheDocument();
    expect(screen.getByText("Please wait...")).toBeInTheDocument();
    expect(document.querySelector(".loading-spinner")).toBeInTheDocument();
  });

  it("renders with custom title and message", () => {
    render(<LoadingSpinner title="Custom Loading Title" message="Custom loading message" />);

    expect(screen.getByText("Custom Loading Title")).toBeInTheDocument();
    expect(screen.getByText("Custom loading message")).toBeInTheDocument();
  });

  it("renders without spinner when showSpinner is false", () => {
    render(<LoadingSpinner showSpinner={false} />);

    expect(screen.getByText("Loading")).toBeInTheDocument();
    expect(screen.getByText("Please wait...")).toBeInTheDocument();
    expect(document.querySelector(".loading-spinner")).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<LoadingSpinner className="custom-loading-class" />);

    const loadingContent = document.querySelector(".loading-content");
    expect(loadingContent).toHaveClass("custom-loading-class");
  });

  it("renders empty title when title is empty string", () => {
    render(<LoadingSpinner title="" message="Just a message" />);

    // The h3 should still exist but be empty
    const titleElement = screen.getByRole("heading", { level: 3 });
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent("");
    expect(screen.getByText("Just a message")).toBeInTheDocument();
  });

  it("renders empty message when message is empty string", () => {
    render(<LoadingSpinner title="Just a title" message="" />);

    expect(screen.getByText("Just a title")).toBeInTheDocument();
    // The p element should still exist but be empty
    const messageElement = screen.getByRole("heading", { level: 3 }).nextElementSibling;
    expect(messageElement).toBeInTheDocument();
    expect(messageElement).toHaveTextContent("");
  });

  it("combines custom className with default loading-content class", () => {
    render(<LoadingSpinner className="overlay-loading custom-class" />);

    const loadingContent = document.querySelector(".loading-content");
    expect(loadingContent).toHaveClass("loading-content");
    expect(loadingContent).toHaveClass("overlay-loading");
    expect(loadingContent).toHaveClass("custom-class");
  });

  it("renders correct HTML structure", () => {
    render(
      <LoadingSpinner
        title="Test Title"
        message="Test Message"
        showSpinner={true}
        className="test-class"
      />
    );

    const container = document.querySelector(".loading-content.test-class");
    expect(container).toBeInTheDocument();

    const spinner = container?.querySelector(".loading-spinner");
    expect(spinner).toBeInTheDocument();

    const title = container?.querySelector("h3");
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent("Test Title");

    const message = container?.querySelector("p");
    expect(message).toBeInTheDocument();
    expect(message).toHaveTextContent("Test Message");
  });

  it("handles all props being undefined gracefully", () => {
    render(<LoadingSpinner title={undefined} message={undefined} />);

    // Should fall back to default values
    expect(screen.getByText("Loading")).toBeInTheDocument();
    expect(screen.getByText("Please wait...")).toBeInTheDocument();
    expect(document.querySelector(".loading-spinner")).toBeInTheDocument();
  });

  it("handles showSpinner being undefined (should default to true)", () => {
    render(<LoadingSpinner showSpinner={undefined} />);

    expect(document.querySelector(".loading-spinner")).toBeInTheDocument();
  });

  it("handles className being undefined", () => {
    render(<LoadingSpinner className={undefined} />);

    const loadingContent = document.querySelector(".loading-content");
    expect(loadingContent).toBeInTheDocument();
    expect(loadingContent?.className).toBe("loading-content ");
  });

  it("renders with long title and message", () => {
    const longTitle = "This is a very long loading title that might wrap to multiple lines";
    const longMessage =
      "This is a very long loading message that provides detailed information about what is currently being loaded and might also wrap to multiple lines";

    render(<LoadingSpinner title={longTitle} message={longMessage} />);

    expect(screen.getByText(longTitle)).toBeInTheDocument();
    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  it("renders with special characters in title and message", () => {
    const specialTitle = "Loading... 50% (10/20) files";
    const specialMessage = "Processing files with special chars: @#$%^&*()";

    render(<LoadingSpinner title={specialTitle} message={specialMessage} />);

    expect(screen.getByText(specialTitle)).toBeInTheDocument();
    expect(screen.getByText(specialMessage)).toBeInTheDocument();
  });

  it("maintains accessibility with proper heading hierarchy", () => {
    render(<LoadingSpinner title="Loading Content" />);

    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Loading Content");
  });

  it("renders multiple instances independently", () => {
    render(
      <div>
        <LoadingSpinner title="First Loader" message="First message" className="first" />
        <LoadingSpinner title="Second Loader" message="Second message" className="second" />
      </div>
    );

    expect(screen.getByText("First Loader")).toBeInTheDocument();
    expect(screen.getByText("First message")).toBeInTheDocument();
    expect(screen.getByText("Second Loader")).toBeInTheDocument();
    expect(screen.getByText("Second message")).toBeInTheDocument();

    const firstLoader = document.querySelector(".loading-content.first");
    const secondLoader = document.querySelector(".loading-content.second");
    expect(firstLoader).toBeInTheDocument();
    expect(secondLoader).toBeInTheDocument();
  });
});
