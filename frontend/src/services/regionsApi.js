const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const allRegionOption = { id: 0, name: "Tümü", boundaryGeoJson: "" };

const fallbackRegions = [
  allRegionOption,
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

function extractArray(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  if (Array.isArray(result?.items)) {
    return result.items;
  }

  if (Array.isArray(result?.regions)) {
    return result.regions;
  }

  return null;
}

function extractObject(result) {
  if (!result) {
    return null;
  }

  if (result.data && typeof result.data === "object") {
    return result.data;
  }

  return result;
}

function normalizeRegion(region, index) {
  return {
    id: region.id ?? region.regionId ?? index + 1,
    name:
      region.name ??
      region.regionName ??
      region.districtName ??
      region.ilceAdi ??
      region.mahalleAdi ??
      `Bölge ${index + 1}`,
    boundaryGeoJson:
      region.boundaryGeoJson ??
      region.geoJson ??
      region.geometry ??
      ""
  };
}

function normalizeSummary(summary, regionId) {
  if (!summary) {
    return null;
  }

  return {
    regionId:
      summary.regionId ??
      summary.id ??
      Number(regionId),

    regionName:
      summary.regionName ??
      summary.name ??
      summary.districtName ??
      summary.ilceAdi ??
      "Bölge",

    chargingStationCount:
      summary.chargingStationCount ??
      summary.stationCount ??
      summary.totalStationCount ??
      0,

    trafficLevel:
      summary.trafficLevel ??
      summary.trafficDensity ??
      summary.trafikYogunlugu ??
      "Veri Eksik",

    mostCommonSocketType:
      summary.mostCommonSocketType ??
      summary.socketType ??
      summary.connectorType ??
      "",

    mostCommonPowerKw:
      summary.mostCommonPowerKw ??
      summary.powerKw ??
      summary.averagePowerKw ??
      null,

    companyDistribution:
      Array.isArray(summary.companyDistribution)
        ? summary.companyDistribution.map((company, index) => ({
            companyName:
              company.companyName ??
              company.name ??
              `Firma ${index + 1}`,
            stationCount:
              company.stationCount ??
              company.count ??
              0
          }))
        : []
  };
}

export async function getRegions() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/regions`);

    if (!response.ok) {
      throw new Error(`Regions request failed: ${response.status}`);
    }

    const result = await response.json();
    const regionArray = extractArray(result);

    if (!regionArray) {
      throw new Error("Regions response is invalid.");
    }

    const normalizedRegions = regionArray.map((region, index) =>
      normalizeRegion(region, index)
    );

    const hasAllOption = normalizedRegions.some(
      (region) => region.id === 0 || region.name === "Tümü"
    );

    return {
      data: hasAllOption
        ? normalizedRegions
        : [allRegionOption, ...normalizedRegions],
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
    const summaryObject = extractObject(result);

    if (!summaryObject) {
      throw new Error("Region summary response is invalid.");
    }

    return {
      data: normalizeSummary(summaryObject, regionId),
      source: "api"
    };
  } catch {
    return {
      data: normalizeSummary(fallbackRegionSummaries[Number(regionId)], regionId),
      source: "local-mock"
    };
  }
}