import { mockCandidatePoints } from "../data/mockCandidatePoints";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

export async function getCandidatePoints() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/candidate-points`);

    if (!response.ok) {
      throw new Error(`Candidate points request failed: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !Array.isArray(result.data)) {
      throw new Error("Candidate points response is invalid.");
    }

    return {
      data: result.data,
      source: "api"
    };
  } catch {
    return {
      data: mockCandidatePoints,
      source: "local-mock"
    };
  }
}
