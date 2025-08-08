import { setIcon } from "obsidian";
import type React from "react";
import { useEffect, useRef } from "react";

/**
 * Props for the ObsidianIcon component
 */
interface ObsidianIconProps {
  /** The name of the Obsidian icon to display */
  iconName: string;
  /** Optional CSS class name to apply to the icon container */
  className?: string;
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
export const ObsidianIcon: React.FC<ObsidianIconProps> = ({ iconName, className = "" }) => {
  const iconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (iconRef.current) {
      iconRef.current.innerHTML = "";
      setIcon(iconRef.current, iconName);
    }
  }, [iconName]);

  return (
    <span ref={iconRef} className={`obsidian-icon ${className}`} data-testid="obsidian-icon" />
  );
};
