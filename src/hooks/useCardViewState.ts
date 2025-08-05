import { useCardExplorerStore } from "../store/cardExplorerStore";

/**
 * Custom hook for managing CardView display states
 *
 * Provides centralized logic for determining which UI state to show
 * based on error, loading, and notes data states.
 *
 * @returns Object containing boolean flags for different display states
 */
export const useCardViewState = () => {
  const { error, isLoading, notes } = useCardExplorerStore();

  // Determine which UI state should be displayed
  const shouldShowError = !!error && !isLoading;
  const shouldShowFullPageLoading = isLoading && notes.length === 0;
  const shouldShowLoadingOverlay = isLoading && notes.length > 0;
  const canShowMainContent = !shouldShowError && !shouldShowFullPageLoading;

  return {
    shouldShowError,
    shouldShowFullPageLoading,
    shouldShowLoadingOverlay,
    canShowMainContent,
    error,
    isLoading,
    notes,
  };
};
