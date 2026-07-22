import { mockChargingStations } from "../data/mockChargingStations";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

const LOCAL_ARAC_SARJ_URL = "/data/ARAC_SARJ.geojson";
const LOCAL_MAHALLE_URL = "/data/MAHALLE.geojson";

function getAuthHeaders() {
  const token = localStorage.getItem("token");

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`
  };
}

async function getJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error(`${path} isteÄŸi baÅŸarÄ±sÄ±z oldu: ${response.status}`);
  }

  return response.json();
}

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

  if (Array.isArray(result?.features)) {
    return result.features;
  }

  if (Array.isArray(result?.chargingStations)) {
    return result.chargingStations;
  }

  return [];
}

function getProperty(source, propertyNames) {
  for (const propertyName of propertyNames) {
    if (source?.[propertyName] !== undefined && source?.[propertyName] !== null) {
      return source[propertyName];
    }
  }

  return null;
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeNumber(value) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return null;
  }

  return numberValue;
}

function getCoordinates(item) {
  if (Array.isArray(item.coordinates) && item.coordinates.length >= 2) {
    return {
      longitude: item.coordinates[0],
      latitude: item.coordinates[1]
    };
  }

  if (
    Array.isArray(item.geometry?.coordinates) &&
    item.geometry.coordinates.length >= 2
  ) {
    return {
      longitude: item.geometry.coordinates[0],
      latitude: item.geometry.coordinates[1]
    };
  }

  return {
    latitude:
      item.latitude ??
      item.lat ??
      item.enlem ??
      item.Enlem ??
      item.ENLEM ??
      null,

    longitude:
      item.longitude ??
      item.lng ??
      item.lon ??
      item.boylam ??
      item.Boylam ??
      item.BOYLAM ??
      null
  };
}

function normalizeChargingStation(
  station,
  index
) {
  const source =
    station?.data ??
    station?.result ??
    station ??
    {};

  const properties =
    source.properties ??
    source;

  const coordinates =
    getCoordinates(source);

  const connectors =
    Array.isArray(
      properties.connectors
    )
      ? properties.connectors
      : [];

  function normalizeArray(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) =>
          normalizeText(item)
        )
        .filter(Boolean);
    }

    const text =
      normalizeText(value);

    if (!text) {
      return [];
    }

    return text
      .split(/[,+]/)
      .map((item) =>
        item.trim()
      )
      .filter(Boolean);
  }

  const directSocketTypes =
    normalizeArray(
      getProperty(
        properties,
        [
          "socketTypes",
          "SocketTypes",
        ]
      )
    );

  const directConnectorTypes =
    normalizeArray(
      getProperty(
        properties,
        [
          "connectorTypes",
          "ConnectorTypes",
        ]
      )
    );

  const connectorSocketTypes =
    connectors
      .map((connector) =>
        normalizeText(
          getProperty(
            connector,
            [
              "socketType",
              "SocketType",
            ]
          )
        )
      )
      .filter(Boolean);

  const connectorTypeValues =
    connectors
      .map((connector) =>
        normalizeText(
          getProperty(
            connector,
            [
              "connectorType",
              "ConnectorType",
            ]
          )
        )
      )
      .filter(Boolean);

  const socketTypes = [
    ...new Set([
      ...directSocketTypes,
      ...connectorSocketTypes,
    ]),
  ];

  const connectorTypes = [
    ...new Set([
      ...directConnectorTypes,
      ...connectorTypeValues,
    ]),
  ];

  const neighborhoodName =
    normalizeText(
      getProperty(
        properties,
        [
          "neighborhoodName",
          "NeighborhoodName",
          "neighborhood",
          "Neighborhood",
          "mahalle",
          "MAHALLE",
          "mahalleAdi",
          "MAHALLE_ADI",
        ]
      )
    ) ||
    "Mahalle bilgisi yok";

  const regionName =
    normalizeText(
      getProperty(
        properties,
        [
          "regionName",
          "RegionName",
          "region",
          "Region",
          "district",
          "District",
          "ilce",
          "ILCE",
          "ilceAdi",
          "ILCE_ADI",
        ]
      )
    ) ||
    "Ankara";

  const directPowerValue =
    getProperty(
      properties,
      [
        "maxPowerKw",
        "MaxPowerKw",
        "powerKw",
        "PowerKw",
        "power",
        "Power",
        "guc",
        "GUC",
        "kw",
        "KW",
        "power_kW",
      ]
    );

  const connectorPowerValues =
    connectors
      .map((connector) =>
        normalizeNumber(
          getProperty(
            connector,
            [
              "powerKw",
              "PowerKw",
              "power",
              "Power",
            ]
          )
        )
      )
      .filter(
        (value) =>
          value !== null &&
          Number.isFinite(value)
      );

  const directPower =
    normalizeNumber(
      directPowerValue
    );

  const maxPowerKw =
    directPower !== null
      ? directPower
      : connectorPowerValues.length > 0
        ? Math.max(
            ...connectorPowerValues
          )
        : null;

  const directSocketType =
    normalizeText(
      getProperty(
        properties,
        [
          "socketType",
          "SocketType",
          "connectorType",
          "ConnectorType",
          "soketTipi",
          "SOKET_TIPI",
          "socket",
          "connector",
        ]
      )
    );

  const socketType =
    socketTypes.join(" + ") ||
    directSocketType ||
    connectorTypes.join(" + ") ||
    "Soket bilgisi yok";

  const power =
    maxPowerKw !== null &&
    Number.isFinite(maxPowerKw)
      ? String(maxPowerKw) +
        " kW"
      : "G\u00fc\u00e7 bilgisi yok";

  const socketCountValue =
    normalizeNumber(
      getProperty(
        properties,
        [
          "socketCount",
          "SocketCount",
        ]
      )
    );

  const calculatedSocketCount =
    connectors.reduce(
      (total, connector) =>
        total +
        (normalizeNumber(
          connector.quantity
        ) || 1),
      0
    );

  return {
    ...properties,

    id:
      getProperty(
        properties,
        [
          "id",
          "Id",
          "ID",
          "stationId",
          "StationId",
          "sarjId",
          "objectId",
          "OBJECTID",
        ]
      ) ??
      index + 1,

    sourceStationNumber:
      normalizeText(
        getProperty(
          properties,
          [
            "sourceStationNumber",
            "SourceStationNumber",
            "ISTASYON_NO",
          ]
        )
      ) ||
      null,

    name:
      normalizeText(
        getProperty(
          properties,
          [
            "name",
            "Name",
            "NAME",
            "stationName",
            "StationName",
            "istasyonAdi",
            "ISTASYON_ADI",
            "adi",
            "ADI",
            "title",
          ]
        )
      ) ||
      `Mevcut \u015earj \u0130stasyonu ${index + 1}`,

    operatorName:
      normalizeText(
        getProperty(
          properties,
          [
            "operatorName",
            "OperatorName",
            "companyName",
            "CompanyName",
            "company",
            "firma",
            "FIRMA",
            "SARJ_AGI_ISLETMECISI",
          ]
        )
      ) ||
      "\u0130\u015fletmeci bilgisi yok",

    companyName:
      normalizeText(
        getProperty(
          properties,
          [
            "companyName",
            "CompanyName",
            "operatorName",
            "OperatorName",
            "company",
            "firma",
            "FIRMA",
            "SARJ_AGI_ISLETMECISI",
          ]
        )
      ) ||
      "Firma bilgisi yok",

    brandName:
      normalizeText(
        getProperty(
          properties,
          [
            "brandName",
            "BrandName",
            "brand",
            "marka",
            "MARKA",
          ]
        )
      ) ||
      null,

    accessType:
      normalizeText(
        getProperty(
          properties,
          [
            "accessType",
            "AccessType",
          ]
        )
      ) ||
      null,

    address:
      normalizeText(
        getProperty(
          properties,
          [
            "address",
            "Address",
            "adres",
            "ADRES",
            "fullAddress",
            "estimatedAddress",
          ]
        )
      ) ||
      "Adres bilgisi yok",

    district:
      regionName,

    regionId:
      getProperty(
        properties,
        [
          "regionId",
          "RegionId",
          "REGION_ID",
          "region_id",
        ]
      ) ??
      null,

    regionName,

    neighborhoodId:
      getProperty(
        properties,
        [
          "neighborhoodId",
          "NeighborhoodId",
          "NEIGHBORHOOD_ID",
          "neighborhood_id",
        ]
      ) ??
      null,

    neighborhood:
      neighborhoodName,

    neighborhoodName,

    socketType,

    connectorType:
      connectorTypes.join(" + ") ||
      directSocketType ||
      "Soket bilgisi yok",

    socketTypes,

    connectorTypes,

    socketCount:
      socketCountValue ??
      calculatedSocketCount,

    power,

    powerKw:
      maxPowerKw,

    maxPowerKw,

    latitude:
      normalizeNumber(
        coordinates.latitude
      ),

    longitude:
      normalizeNumber(
        coordinates.longitude
      ),

    isActive:
      properties.isActive ??
      properties.IsActive ??
      true,

    status:
      getProperty(
        properties,
        [
          "status",
          "Status",
          "STATUS",
          "durum",
          "DURUM",
        ]
      ) ??
      (
        properties.isActive === false
          ? "Pasif"
          : "Aktif"
      ),

    connectors,
  };
}

function normalizeChargingStations(stations) {
  return stations.map((station, index) =>
    normalizeChargingStation(station, index)
  );
}

async function getChargingStationsFromApi(regionId) {
  const query = regionId ? `?regionId=${regionId}` : "";
  const result = await getJson(`/api/charging-stations${query}`);
  return normalizeChargingStations(extractArray(result));
}

async function getChargingStationsFromLocalGeoJson() {
  const response = await fetch(LOCAL_ARAC_SARJ_URL);

  if (!response.ok) {
    throw new Error("ARAC_SARJ.geojson yÃ¼klenemedi.");
  }

  const result = await response.json();
  return normalizeChargingStations(extractArray(result));
}

function getChargingStationsFromMock() {
  return normalizeChargingStations(mockChargingStations);
}

function getRegionName(properties, index) {
  return (
    normalizeText(
      getProperty(properties, [
        "name",
        "NAME",
        "adi",
        "ADI",
        "mahalle",
        "MAHALLE",
        "mahalleAdi",
        "MAHALLE_ADI",
        "MAH_ADI",
        "MahalleAdi",
        "ILCE",
        "ilce",
        "district",
        "districtName"
      ])
    ) || `BÃ¶lge ${index + 1}`
  );
}

function normalizeRegionFeature(feature, index) {
  const properties = feature.properties ?? {};
  const name = getRegionName(properties, index);

  return {
    id:
      getProperty(properties, [
        "id",
        "ID",
        "objectId",
        "OBJECTID",
        "regionId",
        "REGION_ID"
      ]) ?? index + 1,

    name,

    boundaryGeoJson: JSON.stringify({
      type: "Feature",
      properties: {
        id:
          getProperty(properties, [
            "id",
            "ID",
            "objectId",
            "OBJECTID",
            "regionId",
            "REGION_ID"
          ]) ?? index + 1,
        name
      },
      geometry: feature.geometry
    })
  };
}

function normalizeApiRegion(region, index) {
  if (region.boundaryGeoJson) {
    return region;
  }

  if (region.geometry) {
    return {
      ...region,
      id: region.id ?? index + 1,
      name: region.name ?? region.regionName ?? `BÃ¶lge ${index + 1}`,
      boundaryGeoJson: JSON.stringify({
        type: "Feature",
        properties: {
          id: region.id ?? index + 1,
          name: region.name ?? region.regionName ?? `BÃ¶lge ${index + 1}`
        },
        geometry: region.geometry
      })
    };
  }

  return {
    ...region,
    id: region.id ?? index + 1,
    name: region.name ?? region.regionName ?? `BÃ¶lge ${index + 1}`,
    boundaryGeoJson: region.boundaryGeoJson ?? null
  };
}

async function getRegionsFromApi() {
  const result = await getJson("/api/regions");
  return extractArray(result).map((region, index) =>
    normalizeApiRegion(region, index)
  );
}

async function getRegionsFromLocalGeoJson() {
  const response = await fetch(LOCAL_MAHALLE_URL);

  if (!response.ok) {
    throw new Error("MAHALLE.geojson yÃ¼klenemedi.");
  }

  const result = await response.json();
  const features = Array.isArray(result.features) ? result.features : [];

  return features
    .filter((feature) => feature.geometry)
    .slice(0, 80)
    .map((feature, index) => normalizeRegionFeature(feature, index));
}

export async function getChargingStations(regionId) {
  const result = await getChargingStationsWithSource(regionId);
  return result.data;
}

export async function getChargingStationsWithSource(regionId) {
  try {
    const apiStations = await getChargingStationsFromApi(regionId);

    if (apiStations.length > 0) {
      return {
        data: apiStations,
        source: "api"
      };
    }

    return {
      data: await getChargingStationsFromLocalGeoJson(),
      source: "local"
    };
  } catch {
    try {
      return {
        data: await getChargingStationsFromLocalGeoJson(),
        source: "local"
      };
    } catch {
      return {
        data: getChargingStationsFromMock(),
        source: "mock"
      };
    }
  }
}

export async function getChargingStationDetail(id) {
  try {
    const result = await getJson(`/api/charging-stations/${id}`);
    return normalizeChargingStation(result?.data ?? result, 0);
  } catch {
    const stations = await getChargingStations();
    return stations.find((station) => String(station.id) === String(id)) ?? null;
  }
}

export async function getRegions() {
  const result = await getRegionsWithSource();
  return result.data;
}

export async function getRegionsWithSource() {
  try {
    const apiRegions = await getRegionsFromApi();

    if (apiRegions.length > 0 && apiRegions.some((region) => region.boundaryGeoJson)) {
      return { data: apiRegions, source: "api" };
    }

    return {
      data: await getRegionsFromLocalGeoJson(),
      source: "local"
    };
  } catch {
    return {
      data: await getRegionsFromLocalGeoJson(),
      source: "local"
    };
  }
}

export async function getRegionSummary(id) {
  try {
    const result = await getJson(`/api/regions/${id}/summary`);
    return result?.data ?? result;
  } catch {
    return {
      regionId: id,
      regionName: "BÃ¶lge bilgisi",
      chargingStationCount: 0,
      trafficLevel: "Veri Eksik",
      mostCommonSocketType: "Veri Eksik",
      mostCommonPowerKw: null,
      companyDistribution: []
    };
  }
}
