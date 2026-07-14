import { mockCandidatePoints } from "../data/mockCandidatePoints";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

function normalizeCandidatePoint(candidate, index) {
  return {
    id: candidate.id ?? index + 1,

    name:
      candidate.name ??
      candidate.title ??
      `Aday Nokta ${index + 1}`,

    estimatedAddress:
      candidate.estimatedAddress ??
      candidate.address ??
      candidate.fullAddress ??
      "Adres bilgisi yok",

    region:
      candidate.region ??
      candidate.district ??
      candidate.ilce ??
      "Bölge bilgisi yok",

    neighborhood:
      candidate.neighborhood ??
      candidate.mahalle ??
      "Mahalle bilgisi yok",

    estimatedCost:
      candidate.estimatedCost ??
      candidate.cost ??
      candidate.installationCost ??
      null,

    costScore:
      candidate.costScore ??
      candidate.maliyetSkoru ??
      null,

    demandScore:
      candidate.demandScore ??
      candidate.talepSkoru ??
      null,

    generalScore:
      candidate.generalScore ??
      candidate.score ??
      candidate.genelSkor ??
      null,

    latitude:
      candidate.latitude ??
      candidate.lat ??
      null,

    longitude:
      candidate.longitude ??
      candidate.lng ??
      candidate.lon ??
      null,

    systemType:
      candidate.systemType ??
      candidate.chargerType ??
      candidate.sistemTipi ??
      "Veri Eksik",

    placeType:
      candidate.placeType ??
      candidate.locationType ??
      candidate.mekanTuru ??
      "Veri Eksik",

    status:
      candidate.status ??
      "complete"
  };
}

function extractCandidateArray(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  if (Array.isArray(result?.items)) {
    return result.items;
  }

  if (Array.isArray(result?.candidatePoints)) {
    return result.candidatePoints;
  }

  return null;
}

export async function getCandidatePoints() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/candidate-points`);

    if (!response.ok) {
      throw new Error(`Aday nokta isteği başarısız oldu: ${response.status}`);
    }

    const result = await response.json();
    const candidateArray = extractCandidateArray(result);

    if (!candidateArray) {
      throw new Error("Aday nokta yanıtı geçersiz.");
    }

    const normalizedData = candidateArray.map((candidate, index) =>
      normalizeCandidatePoint(candidate, index)
    );

    return {
      data: normalizedData,
      source: "api"
    };
  } catch (error) {
    const normalizedMockData = mockCandidatePoints.map((candidate, index) =>
      normalizeCandidatePoint(candidate, index)
    );

    return {
      data: normalizedMockData,
      source: "local-mock"
    };
  }
}
