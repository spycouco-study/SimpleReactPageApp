import { gameApi } from "./index";

/**
 * Get game JavaScript file
 * @param {string} gameId - Game ID
 * @returns {Promise} Axios response promise
 */
export const getGameJs = (gameId) => {
  return gameApi.get(`/games/${gameId}/game.js`, {
    headers: {
      "Content-Type": "application/javascript",
    },
  });
};

/**
 * Get game data/configuration
 * @param {string} gameId - Game ID
 * @returns {Promise} Axios response promise
 */
export const getGameData = (gameId) => {
  return gameApi.get(`/games/${gameId}/data`);
};

/**
 * Get game assets
 * @param {string} gameId - Game ID
 * @param {string} assetPath - Asset path relative to game directory
 * @returns {Promise} Axios response promise
 */
export const getGameAsset = (gameId, assetPath) => {
  return gameApi.get(`/games/${gameId}/assets/${assetPath}`, {
    responseType: "blob",
  });
};

/**
 * Get game metadata
 * @param {string} gameId - Game ID
 * @returns {Promise} Axios response promise
 */
export const getGameMetadata = (gameId) => {
  return gameApi.get(`/games/${gameId}/metadata`);
};

/**
 * Get list of available games from game server
 * @returns {Promise} Axios response promise
 */
export const getAvailableGames = () => {
  return gameApi.get("/games");
};

/**
 * Get game configuration
 * @param {string} gameId - Game ID
 * @returns {Promise} Axios response promise
 */
export const getGameConfig = (gameId) => {
  return gameApi.get(`/games/${gameId}/config`);
};

/**
 * Load game state
 * @param {string} gameId - Game ID
 * @param {string} stateId - State ID
 * @returns {Promise} Axios response promise
 */
export const loadGameState = (gameId, stateId) => {
  return gameApi.get(`/games/${gameId}/state/${stateId}`);
};

/**
 * Save game state to game server
 * @param {string} gameId - Game ID
 * @param {Object} stateData - Game state data
 * @returns {Promise} Axios response promise
 */
export const saveGameState = (gameId, stateData) => {
  return gameApi.post(`/games/${gameId}/state`, stateData);
};
