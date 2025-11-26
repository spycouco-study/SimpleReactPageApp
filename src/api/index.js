import axios from "axios";

// Create axios instance for FastAPI backend
export const backendApi = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Create axios instance for Game Server
export const gameApi = axios.create({
  baseURL: process.env.REACT_APP_GAME_URL || "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: Add request/response interceptors if needed
// backendApi.interceptors.request.use(
//   (config) => {
//     // Add auth token or other headers here
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// backendApi.interceptors.response.use(
//   (response) => response,
//   (error) => Promise.reject(error)
// );
