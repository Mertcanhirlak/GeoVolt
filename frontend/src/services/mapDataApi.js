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

  if (response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("geovolt:unauthorized", {
        detail: { url: `${API_BASE_URL}${path}`, status: 401 }
      })
    );
  }

  if (!response.ok) {
    throw new Error(`${path} isteği başarısız oldu: ${response.status}`);
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

function normalizeChargingStation(station, index) {
  const properties = station.properties ?? station;
  const coordinates = getCoordinates(station);

  return {
    id:
      getProperty(properties, [
        "id",
        "ID",
        "stationId",
        "sarjId",
        "objectId",
        "OBJECTID"
      ]) ?? index + 1,

    name:
      normalizeText(
        getProperty(properties, [
          "name",
          "NAME",
          "stationName",
          "istasyonAdi",
          "ISTASYON_ADI",
          "adi",
          "ADI",
          "title"
        ])
      ) || `Mevcut Şarj İstasyonu ${index + 1}`,

    operatorName:
      normalizeText(
        getProperty(properties, [
          "operatorName",
          "companyName",
          "company",
          "firma",
          "FIRMA",
          "firmaAdi",
          "FIRMA_ADI",
          "marka",
          "MARKA"
        ])
      ) || "Firma bilgisi yok",

    companyName:
      normalizeText(
        getProperty(properties, [
          "companyName",
          "operatorName",
          "company",
          "firma",
          "FIRMA",
          "firmaAdi",
          "FIRMA_ADI",
          "marka",
          "MARKA"
        ])
      ) || "Firma bilgisi yok",

    address:
      normalizeText(
        getProperty(properties, [
          "address",
          "adres",
          "ADRES",
          "fullAddress",
          "estimatedAddress"
        ])
      ) || "Adres bilgisi yok",

    district:
      normalizeText(
        getProperty(properties, [
          "district",
          "region",
          "regionName",
          "ilce",
          "ILCE",
          "ilceAdi",
          "ILCE_ADI"
        ])
      ) || "Ankara",

    neighborhood:
      normalizeText(
        getProperty(properties, [
          "neighborhood",
          "mahalle",
          "MAHALLE",
          "mahalleAdi",
          "MAHALLE_ADI"
        ])
      ) || "Mahalle bilgisi yok",

    regionId:
      getProperty(properties, ["regionId", "REGION_ID", "region_id"]) ?? null,

    regionName:
      normalizeText(
        getProperty(properties, [
          "regionName",
          "region",
          "district",
          "ilce",
          "ILCE",
          "ilceAdi",
          "ILCE_ADI"
        ])
      ) || "",

    socketType:
      normalizeText(
        getProperty(properties, [
          "socketType",
          "connectorType",
          "soketTipi",
          "SOKET_TIPI",
          "socket",
          "connector"
        ])
      ) || "Soket bilgisi yok",

    connectorType:
      normalizeText(
        getProperty(properties, [
          "connectorType",
          "socketType",
          "soketTipi",
          "SOKET_TIPI",
          "socket",
          "connector"
        ])
      ) || "Soket bilgisi yok",

    power:
      normalizeText(
        getProperty(properties, [
          "power",
          "powerKw",
          "guc",
          "GUC",
          "kw",
          "KW",
          "power_kW"
        ])
      ) || "Güç bilgisi yok",

    powerKw: normalizeNumber(
      getProperty(properties, [
        "powerKw",
        "power",
        "guc",
        "GUC",
        "kw",
        "KW",
        "power_kW"
      ])
    ),

    latitude: normalizeNumber(coordinates.latitude),
    longitude: normalizeNumber(coordinates.longitude),

    status:
      getProperty(properties, ["status", "STATUS", "durum", "DURUM"]) ?? "Aktif",

    connectors: Array.isArray(properties.connectors) ? properties.connectors : []
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
    throw new Error("ARAC_SARJ.geojson yüklenemedi.");
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
    ) || `Bölge ${index + 1}`
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
      name: region.name ?? region.regionName ?? `Bölge ${index + 1}`,
      boundaryGeoJson: JSON.stringify({
        type: "Feature",
        properties: {
          id: region.id ?? index + 1,
          name: region.name ?? region.regionName ?? `Bölge ${index + 1}`
        },
        geometry: region.geometry
      })
    };
  }

  return {
    ...region,
    id: region.id ?? index + 1,
    name: region.name ?? region.regionName ?? `Bölge ${index + 1}`,
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
    throw new Error("MAHALLE.geojson yüklenemedi.");
  }

  const result = await response.json();
  const features = Array.isArray(result.features) ? result.features : [];

  return features
    .filter((feature) => feature.geometry)
    .slice(0, 80)
    .map((feature, index) => normalizeRegionFeature(feature, index));
}

export async function getChargingStations(regionId) {
  try {
    return await getChargingStationsFromApi(regionId);
  } catch {
    try {
      return await getChargingStationsFromLocalGeoJson();
    } catch {
      return getChargingStationsFromMock();
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
  try {
    const apiRegions = await getRegionsFromApi();

    if (apiRegions.length > 0 && apiRegions.some((region) => region.boundaryGeoJson)) {
      return apiRegions;
    }

    return await getRegionsFromLocalGeoJson();
  } catch {
    return await getRegionsFromLocalGeoJson();
  }
}

export async function getRegionSummary(id) {
  try {
    const result = await getJson(`/api/regions/${id}/summary`);
    return result?.data ?? result;
  } catch {
    return {
      regionId: id,
      regionName: "Bölge bilgisi",
      chargingStationCount: 0,
      trafficLevel: "Veri Eksik",
      mostCommonSocketType: "Veri Eksik",
      mostCommonPowerKw: null,
      companyDistribution: []
    };
  }
}
