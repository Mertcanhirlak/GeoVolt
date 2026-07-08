const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const fallbackRegions = [
  { id: 0, name: "Tümü", boundaryGeoJson: "" },
  { id: 1, name: "Kızılay", boundaryGeoJson: "" },
  { id: 2, name: "Söğütözü", boundaryGeoJson: "" },
  { id: 3, name: "Bahçelievler", boundaryGeoJson: "" },
  { id: 4, name: "Oran", boundaryGeoJson: "" },
  { id: 5, name: "Tunalı", boundaryGeoJson: "" }
];

const fallbackRegionSummaries = {
  1: {
    regionId: 1,
    regionName: "Kızılay",
    chargingStationCount: 8,
    trafficLevel: "Yoğun",
    mostCommonSocketType: "Type 2",
    mostCommonPowerKw: 22,
    companyDistribution: [
      { companyName: "ZES", stationCount: 3 },
      { companyName: "Eşarj", stationCount: 2 },
      { companyName: "Trugo", stationCount: 3 }
    ]
  },
  2: {
    regionId: 2,
    regionName: "Söğütözü",
    chargingStationCount: 5,
    trafficLevel: "Orta",
    mostCommonSocketType: "CCS",
    mostCommonPowerKw: 50,
    companyDistribution: [
      { companyName: "ZES", stationCount: 2 },
      { companyName: "Voltrun", stationCount: 1 },
      { companyName: "Eşarj", stationCount: 2 }
    ]
  },
  3: {
    regionId: 3,
    regionName: "Bahçelievler",
    chargingStationCount: 4,
    trafficLevel: "Orta",
    mostCommonSocketType: "Type 2",
    mostCommonPowerKw: 22,
    companyDistribution: [
      { companyName: "ZES", stationCount: 2 },
      { companyName: "Trugo", stationCount: 2 }
    ]
  },
  4: {
    regionId: 4,
    regionName: "Oran",
    chargingStationCount: 2,
    trafficLevel: "Düşük",
    mostCommonSocketType: "CCS",
    mostCommonPowerKw: 60,
    companyDistribution: [
      { companyName: "Eşarj", stationCount: 1 },
      { companyName: "Voltrun", stationCount: 1 }
    ]
  },
  5: {
    regionId: 5,
    regionName: "Tunalı",
    chargingStationCount: 6,
    trafficLevel: "Yoğun",
    mostCommonSocketType: "Type 2",
    mostCommonPowerKw: 22,
    companyDistribution: [
      { companyName: "ZES", stationCount: 2 },
      { companyName: "Eşarj", stationCount: 2 },
      { companyName: "Trugo", stationCount: 2 }
    ]
  }
};

export async function getRegions() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/regions`);

    if (!response.ok) {
      throw new Error(`Regions request failed: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !Array.isArray(result.data)) {
      throw new Error("Regions response is invalid.");
    }

    return {
      data: [{ id: 0, name: "Tümü", boundaryGeoJson: "" }, ...result.data],
      source: "api"
    };
  } catch {
    return {
      data: fallbackRegions,
      source: "local-mock"
    };
  }
}

export async function getRegionSummary(regionId) {
  if (!regionId || Number(regionId) === 0) {
    return {
      data: null,
      source: "none"
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/regions/${regionId}/summary`);

    if (!response.ok) {
      throw new Error(`Region summary request failed: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error("Region summary response is invalid.");
    }

    return {
      data: result.data,
      source: "api"
    };
  } catch {
    return {
      data: fallbackRegionSummaries[Number(regionId)] || null,
      source: "local-mock"
    };
  }
}