import { setIcon } from "obsidian";
import type React from "react";
import { useEffect, useRef } from "react";

/**
 * Props for the ObsidianIcon component
 */

/**
 * Props for the ObsidianIcon component
 *
 * - Extends standard span element attributes for reusability/accessibility
 * - children is explicitly omitted to prevent accidental content overwrite
 */
export interface ObsidianIconProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The name of the Obsidian icon to display */
  iconName: string;
  /** Optional CSS class name to apply to the icon container */
  className?: string;
  /** Optional aria-label for accessibility. If not provided, aria-hidden is true. */
  ariaLabel?: string;
  /** Customizable data-testid for testing */
  dataTestid?: string;
  /** Optional icon size, triggers rerender if changed */
  size?: number | string;
}

/**
 * ObsidianIcon Component
 *
 * A reusable component for displaying Obsidian native icons.
 * Uses Obsidian's setIcon API to render SVG icons consistently across themes.
 *
 * @example
 * <ObsidianIcon iconName="alert-triangle" className="error-icon" />
 * <ObsidianIcon iconName="database" />
 */

export const ObsidianIcon: React.FC<ObsidianIconProps> = ({
  iconName,
  className = "",
  ariaLabel,
  dataTestid = "obsidian-icon",
  size,
  ...rest
}) => {
  const iconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!iconRef.current) return;
    iconRef.current.innerHTML = "";
    // Always delegate to Obsidian's setIcon, even for empty strings
    setIcon(iconRef.current, iconName);
    return () => {
      if (iconRef.current) {
        iconRef.current.innerHTML = "";
      }
    };
  }, [iconName]);

  // Accessibility props
  const accessibilityProps = ariaLabel
    ? { "aria-label": ariaLabel, role: "img" }
    : { "aria-hidden": true };

  return (
    <span
      ref={iconRef}
      className={`obsidian-icon ${className}`}
      data-testid={dataTestid}
      {...accessibilityProps}
      {...rest}
    />
  );
};
