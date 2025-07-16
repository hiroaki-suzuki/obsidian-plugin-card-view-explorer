import { globalStyle, style, styleVariants } from "@vanilla-extract/css";

// Base note card styles
export const noteCard = style({
  position: "relative",
  background: "var(--background-primary)",
  border: "1px solid var(--background-modifier-border)",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "12px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  width: "100%",
  textAlign: "left",
  fontFamily: "inherit",
  fontSize: "inherit",

  ":hover": {
    background: "var(--background-modifier-hover)",
    borderColor: "var(--background-modifier-border-hover)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
    transform: "translateY(-1px)",
  },

  ":focus": {
    outline: "2px solid var(--interactive-accent)",
    outlineOffset: "2px",
  },

  // Dark theme adjustments
  "@media": {
    "(prefers-color-scheme: dark)": {
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
      ":hover": {
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
      },
    },
    // High contrast mode support
    "(prefers-contrast: high)": {
      borderWidth: "2px",
    },
    // Reduced motion support
    "(prefers-reduced-motion: reduce)": {
      transition: "none",
      ":hover": {
        transform: "none",
      },
    },
    // Responsive adjustments
    "(max-width: 600px)": {
      padding: "12px",
      marginBottom: "8px",
    },
  },
});

// Pinned note variant
export const noteCardPinned = style([
  noteCard,
  {
    borderColor: "var(--interactive-accent)",
    background: "var(--background-modifier-form-field)",

    "::before": {
      content: "",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "3px",
      background: "var(--interactive-accent)",
      borderRadius: "8px 8px 0 0",
    },

    "@media": {
      "(prefers-contrast: high)": {
        borderWidth: "3px",
      },
    },
  },
]);

// Pin button styles
export const pinButton = style({
  position: "absolute",
  top: "12px",
  right: "12px",
  width: "24px",
  height: "24px",
  border: "none",
  background: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
  borderRadius: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
  opacity: 0,

  ":hover": {
    background: "var(--background-modifier-hover)",
    color: "var(--text-normal)",
  },

  "@media": {
    "(prefers-reduced-motion: reduce)": {
      transition: "none",
    },
    "(max-width: 600px)": {
      width: "20px",
      height: "20px",
      top: "10px",
      right: "10px",
    },
  },
});

// Pin button variants
export const pinButtonVariants = styleVariants({
  default: [pinButton],
  active: [
    pinButton,
    {
      opacity: "1 !important",
      color: "var(--interactive-accent)",

      ":hover": {
        color: "var(--interactive-accent-hover)",
      },
    },
  ],
});

// Show pin button on card hover using globalStyle
globalStyle(`${noteCard}:hover .pin-button`, {
  opacity: 1,
});

globalStyle(`${noteCardPinned}:hover .pin-button`, {
  opacity: 1,
});

// Pin icon using Obsidian's CSS icon
export const pinIcon = style({
  width: "16px",
  height: "16px",
  backgroundColor: "currentColor",
  maskImage: "var(--icon-pin)",
  maskRepeat: "no-repeat",
  maskPosition: "center",
  maskSize: "contain",
  WebkitMaskImage: "var(--icon-pin)",
  WebkitMaskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  WebkitMaskSize: "contain",
});

// Content area
export const content = style({
  paddingRight: "32px", // Space for pin button

  "@media": {
    "(max-width: 600px)": {
      paddingRight: "28px",
    },
  },
});

// Title
export const title = style({
  margin: "0 0 8px 0",
  fontSize: "16px",
  fontWeight: "600",
  color: "var(--text-normal)",
  lineHeight: "1.3",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",

  "@media": {
    "(max-width: 600px)": {
      fontSize: "15px",
    },
  },
});

// Preview text
export const preview = style({
  color: "var(--text-muted)",
  fontSize: "14px",
  lineHeight: "1.4",
  marginBottom: "12px",
  overflow: "hidden",
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  minHeight: "60px", // Ensure consistent card height

  "@media": {
    "(max-width: 600px)": {
      fontSize: "13px",
      minHeight: "52px",
    },
  },
});

// Footer
export const footer = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "12px",
  color: "var(--text-muted)",
});

export const date = style({
  fontWeight: "500",
});

export const folder = style({
  opacity: "0.8",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: "120px",

  "@media": {
    "(max-width: 600px)": {
      maxWidth: "80px",
    },
  },
});
