import { useCallback, useMemo } from "react";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";

/**
 * Options to customize the retry behavior of {@link useRetryableRefreshNotes}.
 *
 * Keep this surface minimal because the hook is used by UI components that
 * coordinate error boundaries and visual state.
 */
interface Options {
  /**
   * Optional callback to clear any local/UI error state before retrying.
   *
   * The global store error is always cleared by the hook, but components may
   * also maintain their own transient error visuals (e.g. inline banners). Use
   * this to reset those before a refresh attempt.
   */
  resetError?: () => void;
}

/**
 * Returns a small API that retries fetching/refreshing notes with error state
 * reset, intended for use by error UIs (e.g. retry buttons).
 *
 * Design rationale:
 * - Centralizes the sequence: clear UI error → clear store error → refresh.
 * - Accepts the plugin instance and calls `refreshNotes(plugin.app)` because
 *   Obsidian-side note access hangs off the App instance. In Obsidian, the
 *   `plugin` and its `app` are effectively stable during the plugin lifecycle,
 *   so including `plugin.app` in the dependency list is safe and satisfies
 *   exhaustive-deps without creating re-subscriptions.
 *
 * External dependencies: relies on the store's `refreshNotes` to perform the
 * actual fetch and `setError(null)` to clear global error state.
 *
 * @param plugin - The active plugin instance providing the Obsidian `app`.
 * @param options - Optional behaviors like UI error reset callbacks.
 * @returns An object with a single `retry` function to trigger refresh.
 */
export const useRetryableRefreshNotes = (plugin: CardExplorerPlugin, options: Options = {}) => {
  const refreshNotes = useCardExplorerStore((s) => s.refreshNotes);
  const setError = useCardExplorerStore((s) => s.setError);

  const retry = useCallback(async () => {
    // Clear any existing error UI state before attempting a refresh.
    // Clearing local (component) error happens first, then store error, so the
    // UI cannot momentarily display a stale global error after a retry click.
    const reset = options.resetError ?? (() => {});
    reset();
    setError(null);
    await refreshNotes(plugin.app);
  }, [options.resetError, setError, refreshNotes, plugin.app]);

  const api = useMemo(
    () => ({
      retry,
    }),
    [retry]
  );

  return api;
};
