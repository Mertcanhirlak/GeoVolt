const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

const LOCAL_ARAC_SARJ_URL = "/data/ARAC_SARJ.geojson";

const localMockChargingStations = [
  {
    id: 1,
    name: "Çankaya Mevcut Şarj İstasyonu",
    companyName: "ZES",
    address: "Çankaya / Ankara",
    region: "Çankaya",
    neighborhood: "Kızılay",
    socketType: "Type 2",
    powerKw: 22,
    latitude: 39.9208,
    longitude: 32.8541
  },
  {
    id: 2,
    name: "Söğütözü Mevcut Şarj İstasyonu",
    companyName: "Eşarj",
    address: "Söğütözü / Ankara",
    region: "Çankaya",
    neighborhood: "Söğütözü",
    socketType: "CCS",
    powerKw: 50,
    latitude: 39.9128,
    longitude: 32.7924
  },
  {
    id: 3,
    name: "Batıkent Mevcut Şarj İstasyonu",
    companyName: "Voltrun",
    address: "Yenimahalle / Ankara",
    region: "Yenimahalle",
    neighborhood: "Batıkent",
    socketType: "Type 2",
    powerKw: 22,
    latitude: 39.9684,
    longitude: 32.7306
  },
  {
    id: 4,
    name: "Eryaman Mevcut Şarj İstasyonu",
    companyName: "Sharz",
    address: "Etimesgut / Ankara",
    region: "Etimesgut",
    neighborhood: "Eryaman",
    socketType: "CCS",
    powerKw: 60,
    latitude: 39.9767,
    longitude: 32.6156
  }
];

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

  if (Array.isArray(result?.chargingStations)) {
    return result.chargingStations;
  }

  if (Array.isArray(result?.features)) {
    return result.features;
  }

  return null;
}

function getProperty(source, propertyNames) {
  for (const propertyName of propertyNames) {
    if (source?.[propertyName] !== undefined && source?.[propertyName] !== null) {
      return source[propertyName];
    }
  }

  return null;
}

function getCoordinates(station) {
  if (Array.isArray(station.coordinates) && station.coordinates.length >= 2) {
    return {
      longitude: station.coordinates[0],
      latitude: station.coordinates[1]
    };
  }

  if (
    Array.isArray(station.geometry?.coordinates) &&
    station.geometry.coordinates.length >= 2
  ) {
    return {
      longitude: station.geometry.coordinates[0],
      latitude: station.geometry.coordinates[1]
    };
  }

  return {
    latitude: station.latitude ?? station.lat ?? station.enlem ?? null,
    longitude:
      station.longitude ?? station.lng ?? station.lon ?? station.boylam ?? null
  };
}

function normalizeChargingStation(station, index) {
  const properties = station.properties ?? station;
  const coordinates = getCoordinates(station);

  return {
    id:
      getProperty(properties, ["id", "stationId", "sarjId", "objectId", "OBJECTID"]) ??
      index + 1,

    name:
      getProperty(properties, [
        "name",
        "stationName",
        "istasyonAdi",
        "ISTASYON_ADI",
        "adi",
        "ADI",
        "title"
      ]) ?? `Mevcut Şarj İstasyonu ${index + 1}`,

    companyName:
      getProperty(properties, [
        "companyName",
        "company",
        "operatorName",
        "firma",
        "FIRMA",
        "firmaAdi",
        "FIRMA_ADI",
        "marka",
        "MARKA"
      ]) ?? "Firma bilgisi yok",

    address:
      getProperty(properties, [
        "address",
        "adres",
        "ADRES",
        "fullAddress",
        "estimatedAddress"
      ]) ?? "Adres bilgisi yok",

    region:
      getProperty(properties, [
        "region",
        "district",
        "districtName",
        "ilce",
        "ILCE",
        "ilceAdi",
        "ILCE_ADI"
      ]) ?? "Bölge bilgisi yok",

    neighborhood:
      getProperty(properties, [
        "neighborhood",
        "mahalle",
        "MAHALLE",
        "mahalleAdi",
        "MAHALLE_ADI"
      ]) ?? "Mahalle bilgisi yok",

    socketType:
      getProperty(properties, [
        "socketType",
        "connectorType",
        "soketTipi",
        "SOKET_TIPI",
        "socket",
        "connector"
      ]) ?? "Veri Eksik",

    powerKw: getProperty(properties, [
      "powerKw",
      "power",
      "guc",
      "GUC",
      "kw",
      "KW",
      "power_kW"
    ]),

    latitude: coordinates.latitude,
    longitude: coordinates.longitude,

    rawData: station
  };
}

async function getChargingStationsFromApi() {
  const response = await fetch(`${API_BASE_URL}/api/charging-stations`);

  if (!response.ok) {
    throw new Error(`Charging stations request failed: ${response.status}`);
  }

  const result = await response.json();
  const stationArray = extractArray(result);

  if (!stationArray) {
    throw new Error("Charging stations API response is invalid.");
  }

  return stationArray.map((station, index) =>
    normalizeChargingStation(station, index)
  );
}

async function getChargingStationsFromLocalGeoJson() {
  const response = await fetch(LOCAL_ARAC_SARJ_URL);

  if (!response.ok) {
    throw new Error("Local ARAC_SARJ.geojson file could not be loaded.");
  }

  const result = await response.json();
  const stationArray = extractArray(result);

  if (!stationArray) {
    throw new Error("Local ARAC_SARJ.geojson response is invalid.");
  }

  return stationArray.map((station, index) =>
    normalizeChargingStation(station, index)
  );
}

export async function getChargingStations() {
  try {
    const apiData = await getChargingStationsFromApi();

    return {
      source: "api",
      data: apiData
    };
  } catch {
    try {
      const geoJsonData = await getChargingStationsFromLocalGeoJson();

      return {
        source: "local-geojson",
        data: geoJsonData
      };
    } catch {
      const normalizedMockData = localMockChargingStations.map((station, index) =>
        normalizeChargingStation(station, index)
      );

      return {
        source: "local-mock",
        data: normalizedMockData
      };
    }
  }
}