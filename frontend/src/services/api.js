import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const client = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

/**
 * A small, predictable error shape the UI can render directly, so components
 * never have to inspect raw Axios/network error internals.
 */
function toFriendlyError(error) {
  if (error.code === "ECONNABORTED") {
    return {
      message: "The request to the ML backend timed out. It may still be starting up.",
    };
  }
  if (error.response) {
    // Backend responded, but with an error status (e.g. FastAPI HTTPException)
    const detail = error.response.data?.detail;
    return {
      message:
        typeof detail === "string"
          ? detail
          : "The ML backend returned an error while preparing the results.",
      status: error.response.status,
    };
  }
  // No response at all — the server is very likely not running
  return {
    message: "Unable to connect to the ML backend. Make sure the FastAPI server is running.",
  };
}

async function get(path, config) {
  try {
    const response = await client.get(path, config);
    return response.data;
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/** Absolute URL for a backend static asset path such as /static/figures/u3/x.png */
export function assetUrl(path) {
  if (!path) return null;
  return /^https?:/.test(path) ? path : `${API_URL}${path}`;
}

export const fetchHealth = () => get("/");

// Results parsed from the executed notebooks' saved outputs.
export const fetchKMeansResults = () => get("/u3/results");
export const fetchMarkovResults = () => get("/u4/results");

// Re-execute the notebook processing from the raw inputs (CSV / GeoTIFF).
// Fitting K-Means on ~650k points with 10 restarts takes a while, so these get
// a longer timeout - same Axios instance and base URL.
const RERUN_TIMEOUT_MS = 300000;
export const rerunKMeans = () => get("/u3/rerun", { timeout: RERUN_TIMEOUT_MS });
export const rerunMarkov = () => get("/u4/rerun", { timeout: RERUN_TIMEOUT_MS });

export default client;
