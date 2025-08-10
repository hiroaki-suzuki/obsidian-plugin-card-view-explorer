import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import { useCardExplorerStore } from "../../store/cardExplorerStore";
import { EmptyState } from "./EmptyState";

vi.mock("../../store/cardExplorerStore", () => ({
  useCardExplorerStore: vi.fn(),
}));

const mockUseCardExplorerStore = vi.mocked(useCardExplorerStore);

describe("EmptyState", () => {
  let mockClearFilters: ReturnType<typeof vi.fn>;
  let mockGetState: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockClearFilters = vi.fn();
    mockGetState = vi.fn(() => ({ clearFilters: mockClearFilters }));
    // Type-safe mock: supports both with/without selector
    (mockUseCardExplorerStore as any).mockImplementation((selector?: any) => {
      const state = mockGetState();
      return selector ? selector(state) : state;
    });
    (mockUseCardExplorerStore as any).getState = mockGetState;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders layout, icon, default copy and button", () => {
    render(<EmptyState />);

    const container = document.querySelector(".virtual-list-container") as HTMLElement;
    const empty = document.querySelector(".virtual-list-empty") as HTMLElement;
    const iconWrapper = document.querySelector(".empty-icon") as HTMLElement;

    expect(container).toBeInTheDocument();
    expect(empty).toBeInTheDocument();
    expect(iconWrapper).toBeInTheDocument();
    expect(container).toContainElement(empty);

    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("No Notes Found");

    expect(screen.getByText(/No notes match your current filters/i)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Clear Filters" })).toBeInTheDocument();
  });

  it("invokes store.clearFilters when clicking the button", async () => {
    const user = userEvent.setup();
    render(<EmptyState />);

    const button = screen.getByRole("button", { name: "Clear Filters" });
    await user.click(button);

    expect(mockGetState).toHaveBeenCalled();
    expect(mockClearFilters).toHaveBeenCalled();
  });
});
