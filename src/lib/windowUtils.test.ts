import { afterEach, describe, expect, it, vi } from "vitest";
import { reloadPage } from "./windowUtils";

describe("reloadPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls reload on provided target once", () => {
    const reloadMock = vi.fn();
    reloadPage({ reload: reloadMock });
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
