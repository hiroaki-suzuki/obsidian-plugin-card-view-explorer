import { useEffect } from "react";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";

/**
 * Custom hook for CardView initialization logic
 *
 * Handles the initial setup of the CardView component:
 * 1. Initializes store from plugin data and settings
 * 2. Performs initial notes loading from vault
 *
 * @param plugin - The CardExplorer plugin instance
 */
export const useCardViewInitialization = (plugin: CardExplorerPlugin) => {
  const initializeFromPluginData = useCardExplorerStore((s) => s.initializeFromPluginData);
  const refreshNotes = useCardExplorerStore((s) => s.refreshNotes);

  // Initialize store from plugin data and settings
  useEffect(() => {
    const data = plugin.getData();
    const settings = plugin.getSettings();
    initializeFromPluginData(data, settings);
  }, [plugin, initializeFromPluginData]);

  // Load initial notes from vault
  useEffect(() => {
    const loadInitialNotes = async () => {
      await refreshNotes(plugin.app);
    };

    loadInitialNotes();
  }, [plugin.app, refreshNotes]);
};
