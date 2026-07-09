const LOCAL_ROAD_URL = "/data/YOL.geojson";

const fallbackRoads = [
  {
    id: 1,
    name: "Atatürk Bulvarı",
    roadType: "Ana Yol",
    speedLimit: 50,
    averageSpeed: 20
  },
  {
    id: 2,
    name: "Eskişehir Yolu",
    roadType: "Bulvar",
    speedLimit: 70,
    averageSpeed: 35
  }
];

function extractArray(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.roads)) return result.roads;
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

function normalizeRoad(road, index) {
  const properties = road.properties ?? road;

  return {
    id: getProperty(properties, ["ID", "id", "roadId", "YOL_ID", "OBJECTID"]) ?? index + 1,

    name:
      normalizeText(
        getProperty(properties, ["NAME", "name", "ADI", "adi", "AD", "ad", "ANNAME"])
      ) || `Yol ${index + 1}`,

    roadType:
      normalizeText(
        getProperty(properties, ["TYPES", "types", "roadType", "ROAD_TYPE", "TYPE", "type"])
      ) || "Tip bilgisi yok",

    directionFlag: normalizeText(getProperty(properties, ["DF", "df"])),

    roadCode: normalizeText(getProperty(properties, ["TR", "tr", "VTR", "vtr"])),

    speedLimit: normalizeNumber(getProperty(properties, ["SPEED", "speed"])),

    averageSpeed: normalizeNumber(
      getProperty(properties, ["SPEED_AVG", "speedAvg", "averageSpeed"])
    ),

    geometry: road.geometry ?? null,
    rawData: road
  };
}

function normalizeRoads(roads) {
  return roads.map((road, index) => normalizeRoad(road, index));
}

async function getRoadsFromLocalGeoJson() {
  const response = await fetch(LOCAL_ROAD_URL);

  if (!response.ok) {
    throw new Error("Local YOL.geojson file could not be loaded.");
  }

  const result = await response.json();
  const roadArray = extractArray(result);

  if (!roadArray) {
    throw new Error("Local YOL.geojson response is invalid.");
  }

  return normalizeRoads(roadArray);
}

export async function getRoads() {
  try {
    const localRoads = await getRoadsFromLocalGeoJson();

    return {
      data: localRoads,
      source: "local-geojson"
    };
  } catch {
    return {
      data: normalizeRoads(fallbackRoads),
      source: "local-mock"
    };
  }
}