const LOCAL_TRAFO_URL = "/data/TRAFO.geojson";

let localTrafosPromise = null;

const fallbackTrafos = [
  {
    id: 1,
    name: "Direk Üstü Elektrik Trafosu",
    category: "Enerji Üretim, Dağıtım",
    subCategory: "Şehiriçi Trafo",
    latitude: 39.9208,
    longitude: 32.8541
  },
  {
    id: 2,
    name: "Elektrik Trafosu",
    category: "Enerji Üretim, Dağıtım",
    subCategory: "Dağıtım Trafosu",
    latitude: 39.9128,
    longitude: 32.7924
  }
];

function extractArray(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.trafos)) return result.trafos;
  if (Array.isArray(result?.features)) return result.features;

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

function getCoordinates(trafo) {
  if (Array.isArray(trafo.coordinates) && trafo.coordinates.length >= 2) {
    return {
      longitude: trafo.coordinates[0],
      latitude: trafo.coordinates[1]
    };
  }

  if (
    Array.isArray(trafo.geometry?.coordinates) &&
    trafo.geometry.coordinates.length >= 2
  ) {
    return {
      longitude: trafo.geometry.coordinates[0],
      latitude: trafo.geometry.coordinates[1]
    };
  }

  return {
    latitude: trafo.latitude ?? trafo.lat ?? trafo.enlem ?? null,
    longitude: trafo.longitude ?? trafo.lng ?? trafo.lon ?? trafo.boylam ?? null
  };
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeTrafo(trafo, index) {
  const properties = trafo.properties ?? trafo;
  const coordinates = getCoordinates(trafo);

  return {
    id: getProperty(properties, ["ID", "id", "trafoId", "TRAFO_ID", "OBJECTID"]) ?? index + 1,

    name:
      normalizeText(
        getProperty(properties, ["NAME", "name", "ADI", "adi", "AD", "ad"])
      ) || `Trafo ${index + 1}`,

    category:
      normalizeText(
        getProperty(properties, ["CATEGORY", "category", "KATEGORI", "kategori"])
      ) || "Kategori bilgisi yok",

    subCategory:
      normalizeText(
        getProperty(properties, [
          "SUB_CATEGORY",
          "subCategory",
          "ALT_KATEGORI",
          "altKategori",
          "TRAFO_TIPI",
          "trafoTipi"
        ])
      ) || "Alt kategori bilgisi yok",

    phone: normalizeText(getProperty(properties, ["PHONE", "phone"])),

    web: normalizeText(getProperty(properties, ["WEB", "web"])),

    latitude: coordinates.latitude,
    longitude: coordinates.longitude,

    rawData: trafo
  };
}

function normalizeTrafos(trafos) {
  return trafos.map((trafo, index) => normalizeTrafo(trafo, index));
}

async function getTrafosFromLocalGeoJson() {
  if (!localTrafosPromise) {
    localTrafosPromise = (async () => {
      const response = await fetch(LOCAL_TRAFO_URL);

      if (!response.ok) {
        throw new Error("Yerel TRAFO.geojson dosyası yüklenemedi.");
      }

      const result = await response.json();
      const trafoArray = extractArray(result);

      if (!trafoArray) {
        throw new Error("Yerel TRAFO.geojson yanıtı geçersiz.");
      }

      return normalizeTrafos(trafoArray);
    })().catch((error) => {
      localTrafosPromise = null;
      throw error;
    });
  }

  return localTrafosPromise;
}

export async function getTrafos() {
  try {
    const localTrafos = await getTrafosFromLocalGeoJson();

    return {
      data: localTrafos,
      source: "local-geojson"
    };
  } catch {
    return {
      data: normalizeTrafos(fallbackTrafos),
      source: "local-mock"
    };
  }
}
