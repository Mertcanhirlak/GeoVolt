const LOCAL_POI_URL = "/data/POI.geojson";

const fallbackPois = [
  {
    id: 1,
    name: "Kızılay AVM",
    category: "AVM",
    region: "Çankaya",
    neighborhood: "Kızılay Mahallesi",
    latitude: 39.9208,
    longitude: 32.8541
  },
  {
    id: 2,
    name: "Söğütözü İş Merkezi",
    category: "İş Merkezi",
    region: "Çankaya",
    neighborhood: "Söğütözü Mahallesi",
    latitude: 39.9128,
    longitude: 32.7924
  },
  {
    id: 3,
    name: "Bahçelievler Restoran Bölgesi",
    category: "Restoran",
    region: "Çankaya",
    neighborhood: "Bahçelievler Mahallesi",
    latitude: 39.9276,
    longitude: 32.8243
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

  if (Array.isArray(result?.pois)) {
    return result.pois;
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

function getCoordinates(poi) {
  if (Array.isArray(poi.coordinates) && poi.coordinates.length >= 2) {
    return {
      longitude: poi.coordinates[0],
      latitude: poi.coordinates[1]
    };
  }

  if (Array.isArray(poi.geometry?.coordinates) && poi.geometry.coordinates.length >= 2) {
    return {
      longitude: poi.geometry.coordinates[0],
      latitude: poi.geometry.coordinates[1]
    };
  }

  return {
    latitude: poi.latitude ?? poi.lat ?? poi.enlem ?? null,
    longitude: poi.longitude ?? poi.lng ?? poi.lon ?? poi.boylam ?? null
  };
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizePoi(poi, index) {
  const properties = poi.properties ?? poi;
  const coordinates = getCoordinates(poi);

  return {
    id:
      getProperty(properties, [
        "id",
        "poiId",
        "POI_ID",
        "objectId",
        "OBJECTID"
      ]) ?? index + 1,

    name:
      normalizeText(
        getProperty(properties, [
          "name",
          "NAME",
          "adi",
          "ADI",
          "ad",
          "AD",
          "poiName",
          "POI_NAME",
          "tesisAdi",
          "TESIS_ADI"
        ])
      ) || `POI ${index + 1}`,

    category:
      normalizeText(
        getProperty(properties, [
          "category",
          "CATEGORY",
          "type",
          "TYPE",
          "tur",
          "TUR",
          "kategori",
          "KATEGORI",
          "poiType",
          "POI_TYPE"
        ])
      ) || "Kategori bilgisi yok",

    region:
      normalizeText(
        getProperty(properties, [
          "region",
          "district",
          "districtName",
          "ilce",
          "ILCE",
          "ilceAdi",
          "ILCE_ADI"
        ])
      ) || "Bölge bilgisi yok",

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

    latitude: coordinates.latitude,
    longitude: coordinates.longitude,

    rawData: poi
  };
}

function normalizePois(pois) {
  return pois.map((poi, index) => normalizePoi(poi, index));
}

async function getPoisFromLocalGeoJson() {
  const response = await fetch(LOCAL_POI_URL);

  if (!response.ok) {
    throw new Error("Local POI.geojson file could not be loaded.");
  }

  const result = await response.json();
  const poiArray = extractArray(result);

  if (!poiArray) {
    throw new Error("Local POI.geojson response is invalid.");
  }

  return normalizePois(poiArray);
}

export async function getPois() {
  try {
    const localPois = await getPoisFromLocalGeoJson();

    return {
      data: localPois,
      source: "local-geojson"
    };
  } catch {
    return {
      data: normalizePois(fallbackPois),
      source: "local-mock"
    };
  }
}