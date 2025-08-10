import type React from "react";
import { LoadingSpinner } from "../LoadingSpinner";

/**
 * LoadingState
 *
 * Thin adapter that renders the standardized loading UI (LoadingSpinner)
 * inside the VirtualList layout wrappers. This preserves the container
 * semantics and styling hooks relied upon by VirtualList while centralizing
 * the loading visuals and copy in a single component (LoadingSpinner).
 *
 * Design rationale:
 * - Preserve layout wrappers: keep `virtual-list-container`/`virtual-list-loading`
 *   so sizing and spacing remain consistent wherever VirtualList expects them.
 * - Centralize visuals/tests: delegate the actual loading UI to LoadingSpinner
 *   to avoid divergence and make behavior easier to test.
 *
 * External dependency notes:
 * - The wrapper classNames integrate with the plugin's stylesheet and Obsidian
 *   theme variables; LoadingSpinner provides the shared spinner/content markup.
 */
export const LoadingState: React.FC = () => {
  return (
    // Keep these wrappers to preserve VirtualList's expected layout structure
    <div className="virtual-list-container">
      <div className="virtual-list-loading">
        {/* Delegate actual loading UI to a single, tested component */}
        {/* Copy is fixed to maintain consistent UX across the app */}
        <LoadingSpinner title="Loading" message="Loading notes..." />
      </div>
    </div>
  );
};
