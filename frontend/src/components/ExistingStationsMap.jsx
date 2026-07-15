import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Feature from "ol/Feature";
import OlMap from "ol/Map";
import View from "ol/View";
import GeoJSON from "ol/format/GeoJSON";
import { union } from "@turf/union";
import Point from "ol/geom/Point";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";

import "ol/ol.css";

import {
  getCenter,
} from "ol/extent";

import {
  fromLonLat,
} from "ol/proj";

import Cluster from "ol/source/Cluster";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";

import {
  Circle as CircleStyle,
  Fill,
  Icon,
  Stroke,
  Style,
  Text,
} from "ol/style";

import {
  mockChargingStations,
} from "../data/mockChargingStations";

import {
  getChargingStationDetail,
  getChargingStations,
  getRegions,
  getRegionSummary,
} from "../services/mapDataApi";

import "./ExistingStationsMap.css";

const CANKAYA_CENTER = fromLonLat([
  32.8541,
  39.9208,
]);

const GEOJSON_URLS = {
  poi: "/data/POI.geojson",
  trafo: "/data/TRAFO.geojson",
  road: "/data/YOL.geojson",
};


const PLACE_SEARCH_PRESETS = [
  {
    id: "odtu",
    label: "ODTÜ",
    aliases: [
      "odtu",
      "odtü",
      "orta dogu teknik universitesi",
      "orta doğu teknik üniversitesi",
      "orta dogu teknik üniversitesi",
      "orta doğu teknik universitesi",
    ],
    longitude: 32.7846,
    latitude: 39.8914,
    zoom: 15.7,
  },
  {
    id: "bilkent",
    label: "Bilkent Üniversitesi",
    aliases: [
      "bilkent",
      "bilkent universitesi",
      "bilkent üniversitesi",
    ],
    longitude: 32.7497,
    latitude: 39.8681,
    zoom: 15.5,
  },
  {
    id: "hacettepe",
    label: "Hacettepe Beytepe",
    aliases: [
      "hacettepe",
      "hacettepe beytepe",
      "hacettepe universitesi",
      "hacettepe üniversitesi",
    ],
    longitude: 32.7337,
    latitude: 39.8672,
    zoom: 15.5,
  },
  {
    id: "kizilay",
    label: "Kızılay",
    aliases: [
      "kizilay",
      "kızılay",
    ],
    longitude: 32.8541,
    latitude: 39.9208,
    zoom: 16,
  },
  {
    id: "ulus",
    label: "Ulus",
    aliases: ["ulus"],
    longitude: 32.8548,
    latitude: 39.9415,
    zoom: 16,
  },
  {
    id: "bahcelievler",
    label: "Bahçelievler",
    aliases: [
      "bahcelievler",
      "bahçelievler",
    ],
    longitude: 32.8237,
    latitude: 39.9231,
    zoom: 15.5,
  },
  {
    id: "dikmen",
    label: "Dikmen",
    aliases: ["dikmen"],
    longitude: 32.8403,
    latitude: 39.8873,
    zoom: 15.5,
  },
  {
    id: "cebeci",
    label: "Cebeci",
    aliases: ["cebeci"],
    longitude: 32.8782,
    latitude: 39.9263,
    zoom: 15.5,
  },
];

const regionColors = [
  "rgba(74, 222, 128, 0.54)",
  "rgba(96, 165, 250, 0.5)",
  "rgba(250, 204, 21, 0.52)",
  "rgba(248, 113, 113, 0.48)",
  "rgba(192, 132, 252, 0.5)",
  "rgba(45, 212, 191, 0.5)",
];

const regionStyleCache =
  new Map();

const poiClusterStyleCache =
  new Map();

const trafoClusterStyleCache =
  new Map();

const singlePoiStyle = new Style({
  image: new CircleStyle({
    radius: 3.5,
    fill: new Fill({
      color:
        "rgba(15, 23, 42, 0.92)",
    }),
    stroke: new Stroke({
      color: "#ffffff",
      width: 1,
    }),
  }),
});

const singleTrafoStyle =
  new Style({
    image: new CircleStyle({
      radius: 4,
      fill: new Fill({
        color:
          "rgba(234, 88, 12, 0.94)",
      }),
      stroke: new Stroke({
        color: "#ffffff",
        width: 1,
      }),
    }),
  });

const roadStyle = new Style({
  stroke: new Stroke({
    color:
      "rgba(37, 99, 235, 0.38)",
    width: 1.2,
  }),
});

function normalizeText(value) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(/ı/g, "i")
    .replace(
      /[^a-z0-9\s]/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}


function getRegionRecordName(
  region
) {
  return String(
    region?.name ??
      region?.Name ??
      region?.regionName ??
      region?.RegionName ??
      "Bilinmeyen Bölge"
  ).trim();
}

function getRegionRecordId(
  region
) {
  return (
    region?.id ??
    region?.Id ??
    region?.regionId ??
    region?.RegionId ??
    null
  );
}

function getRegionBoundary(
  region
) {
  const possibleValues = [
    region?.boundaryGeoJson,
    region?.boundaryGeoJSON,
    region?.BoundaryGeoJson,
    region?.BoundaryGeoJSON,
    region?.boundary,
    region?.Boundary,
    region?.geometry,
    region?.Geometry,
    region?.geoJson,
    region?.geoJSON,
    region?.GeoJson,
    region?.GeoJSON,
  ];

  for (
    const value
    of possibleValues
  ) {
    if (!value) {
      continue;
    }

    if (
      typeof value ===
      "object"
    ) {
      return value;
    }

    if (
      typeof value ===
      "string"
    ) {
      try {
        return JSON.parse(value);
      } catch {
        continue;
      }
    }
  }

  return null;
}

function getRegionGroupKey(
  region,
  index
) {
  const regionId =
    getRegionRecordId(region);

  if (
    regionId !== null &&
    regionId !== undefined &&
    String(regionId).trim() !== ""
  ) {
    return `id:${regionId}`;
  }

  const normalizedName =
    normalizeText(
      getRegionRecordName(region)
    );

  return `name:${
    normalizedName || index
  }`;
}

function extractPolygonFeatures(
  geoJsonValue
) {
  if (!geoJsonValue) {
    return [];
  }

  if (
    geoJsonValue.type ===
    "FeatureCollection"
  ) {
    return geoJsonValue.features.flatMap(
      extractPolygonFeatures
    );
  }

  if (geoJsonValue.type === "Feature") {
    return extractPolygonFeatures(
      geoJsonValue.geometry
    );
  }

  if (
    geoJsonValue.type ===
    "GeometryCollection"
  ) {
    return geoJsonValue.geometries.flatMap(
      extractPolygonFeatures
    );
  }

  if (geoJsonValue.type === "Polygon") {
    return [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates:
            geoJsonValue.coordinates,
        },
      },
    ];
  }

  if (
    geoJsonValue.type ===
    "MultiPolygon"
  ) {
    return geoJsonValue.coordinates.map(
      (polygonCoordinates) => ({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates:
            polygonCoordinates,
        },
      })
    );
  }

  return [];
}

function createFallbackMultiPolygon(
  polygonFeatures
) {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "MultiPolygon",
      coordinates:
        polygonFeatures.map(
          (polygonFeature) =>
            polygonFeature.geometry
              .coordinates
        ),
    },
  };
}

function dissolvePolygonFeatures(
  polygonFeatures,
  regionName
) {
  if (
    !Array.isArray(polygonFeatures) ||
    polygonFeatures.length === 0
  ) {
    return null;
  }

  if (polygonFeatures.length === 1) {
    return polygonFeatures[0];
  }

  try {
    return (
      union({
        type: "FeatureCollection",
        features: polygonFeatures,
      }) ||
      createFallbackMultiPolygon(
        polygonFeatures
      )
    );
  } catch (error) {
    console.error(
      `${regionName} polygon parçaları birleştirilemedi:`,
      error
    );

    return createFallbackMultiPolygon(
      polygonFeatures
    );
  }
}

function mergeRegionsByName(
  regions
) {
  const groupedRegions =
    new Map();

  regions.forEach(
    (region, index) => {
      const groupKey =
        getRegionGroupKey(
          region,
          index
        );

      const regionId =
        getRegionRecordId(region);

      const existingGroup =
        groupedRegions.get(
          groupKey
        );

      if (existingGroup) {
        if (
          regionId !== null &&
          regionId !== undefined &&
          !existingGroup.regionIds.some(
            (currentId) =>
              String(currentId) ===
              String(regionId)
          )
        ) {
          existingGroup.regionIds.push(
            regionId
          );
        }

        existingGroup.sourceRegions.push(
          region
        );

        return;
      }

      groupedRegions.set(
        groupKey,
        {
          ...region,
          id: regionId,
          name:
            getRegionRecordName(
              region
            ),
          regionIds:
            regionId === null ||
            regionId === undefined
              ? []
              : [regionId],
          sourceRegions: [
            region,
          ],
        }
      );
    }
  );

  return Array.from(
    groupedRegions.values()
  );
}

function getSearchMatchScore(
  value,
  normalizedSearch
) {
  const normalizedValue =
    normalizeText(value);

  if (
    !normalizedValue ||
    !normalizedSearch
  ) {
    return Number.POSITIVE_INFINITY;
  }

  if (
    normalizedValue ===
    normalizedSearch
  ) {
    return 0;
  }

  if (
    normalizedValue.startsWith(
      normalizedSearch
    )
  ) {
    return 1;
  }

  if (
    normalizedValue.includes(
      normalizedSearch
    )
  ) {
    return 2;
  }

  return Number.POSITIVE_INFINITY;
}

function createClusterStyle(
  feature,
  layerType
) {
  const clusteredFeatures =
    feature.get("features") || [];

  const size =
    clusteredFeatures.length;

  if (size <= 1) {
    return layerType === "poi"
      ? singlePoiStyle
      : singleTrafoStyle;
  }

  const cache =
    layerType === "poi"
      ? poiClusterStyleCache
      : trafoClusterStyleCache;

  if (cache.has(size)) {
    return cache.get(size);
  }

  const isPoi =
    layerType === "poi";

  const radius =
    size > 999
      ? 19
      : size > 499
        ? 17
        : size > 99
          ? 15
          : size > 19
            ? 13
            : 11;

  const style = new Style({
    image: new CircleStyle({
      radius,
      fill: new Fill({
        color: isPoi
          ? "rgba(15, 23, 42, 0.9)"
          : "rgba(234, 88, 12, 0.92)",
      }),
      stroke: new Stroke({
        color: "#ffffff",
        width: 2,
      }),
    }),

    text: new Text({
      text: String(size),
      fill: new Fill({
        color: "#ffffff",
      }),
      stroke: new Stroke({
        color:
          "rgba(0, 0, 0, 0.8)",
        width: 2,
      }),
      font: "bold 11px Arial",
    }),
  });

  cache.set(size, style);

  return style;
}

function formatConnectors(
  connectors = []
) {
  if (
    !Array.isArray(connectors) ||
    connectors.length === 0
  ) {
    return null;
  }

  return connectors
    .map((connector) => {
      const quantity =
        connector.quantity > 1
          ? `${connector.quantity}x `
          : "";

      return `${quantity}${connector.socketType}`;
    })
    .join(" + ");
}

function formatPower(
  connectors = []
) {
  if (
    !Array.isArray(connectors) ||
    connectors.length === 0
  ) {
    return null;
  }

  const maxPower = Math.max(
    ...connectors.map(
      (connector) =>
        Number(
          connector.powerKw
        ) || 0
    )
  );

  return maxPower > 0
    ? `${maxPower} kW`
    : null;
}

function normalizeStation(
  station,
  regionLookup = new Map()
) {
  const rawStation =
    station?.data ??
    station?.result ??
    station ??
    {};

  const connectors =
    Array.isArray(
      rawStation.connectors
    )
      ? rawStation.connectors
      : [];

  const socketTypes =
    Array.isArray(
      rawStation.socketTypes
    )
      ? rawStation.socketTypes
          .filter(Boolean)
      : [];

  const connectorTypes =
    Array.isArray(
      rawStation.connectorTypes
    )
      ? rawStation.connectorTypes
          .filter(Boolean)
      : [];

  const status =
    rawStation.status ??
    (rawStation.isActive === false
      ? "Pasif"
      : "Aktif");

  const regionName =
    rawStation.regionName ||
    rawStation.region ||
    regionLookup.get(
      rawStation.regionId
    ) ||
    "B\u00f6lge bilgisi yok";

  const neighborhoodName =
    rawStation.neighborhoodName ||
    rawStation.neighborhood ||
    "Mahalle bilgisi yok";

  const connectorText =
    formatConnectors(
      connectors
    );

  const connectorPowerText =
    formatPower(
      connectors
    );

  const numericPower =
    Number(
      rawStation.maxPowerKw ??
      rawStation.powerKw ??
      rawStation.power
    );

  const powerText =
    Number.isFinite(
      numericPower
    ) &&
    numericPower > 0
      ? String(numericPower) +
        " kW"
      : rawStation.power ||
        connectorPowerText ||
        "G\u00fc\u00e7 bilgisi yok";

  const socketText =
    socketTypes.join(" + ") ||
    rawStation.socketType ||
    connectorTypes.join(" + ") ||
    rawStation.connectorType ||
    connectorText ||
    "Soket bilgisi yok";

  const fallbackLocation =
    neighborhoodName !==
    "Mahalle bilgisi yok"
      ? neighborhoodName
      : regionName;

  return {
    ...rawStation,

    id:
      rawStation.id,

    name:
      rawStation.name ||
      "\u015earj \u0130stasyonu",

    district:
      rawStation.district ||
      regionName,

    regionId:
      rawStation.regionId ??
      null,

    regionName,

    neighborhoodId:
      rawStation.neighborhoodId ??
      null,

    neighborhood:
      neighborhoodName,

    neighborhoodName,

    address:
      rawStation.address ||
      fallbackLocation +
        ", Ankara",

    latitude:
      Number(
        rawStation.latitude
      ),

    longitude:
      Number(
        rawStation.longitude
      ),

    socketType:
      socketText,

    power:
      powerText,

    maxPowerKw:
      Number.isFinite(
        numericPower
      )
        ? numericPower
        : null,

    socketCount:
      Number(
        rawStation.socketCount
      ) ||
      connectors.reduce(
        (
          total,
          connector
        ) =>
          total +
          (Number(
            connector.quantity
          ) || 1),
        0
      ),

    operatorName:
      rawStation.operatorName ||
      "\u0130\u015fletmeci bilgisi yok",

    brandName:
      rawStation.brandName ||
      null,

    sourceStationNumber:
      rawStation.sourceStationNumber ||
      null,

    connectors,

    socketTypes,

    connectorTypes,

    status,
  };
}


function createPinStyle(
  station,
  isSelected
) {
  const color =
    station.status === "Aktif"
      ? "#ef233c"
      : "#f59e0b";

  return new Style({
    image: new Icon({
      src:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(`
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="38"
            viewBox="0 0 30 38"
          >
            <path
              d="M15 36s12-11.5 12-22A12 12 0 1 0 3 14c0 10.5 12 22 12 22z"
              fill="${
                isSelected
                  ? "#2563eb"
                  : color
              }"
              stroke="white"
              stroke-width="3"
            />
            <circle
              cx="15"
              cy="14"
              r="4.6"
              fill="white"
            />
          </svg>
        `),

      anchor: [0.5, 1],

      scale:
        isSelected
          ? 1.12
          : 0.82,
    }),
  });
}

function createStationFeature(
  station,
  selectedStationId
) {
  if (
    !Number.isFinite(
      station.longitude
    ) ||
    !Number.isFinite(
      station.latitude
    )
  ) {
    return null;
  }

  const feature =
    new Feature({
      geometry: new Point(
        fromLonLat([
          station.longitude,
          station.latitude,
        ])
      ),

      station,

      featureType:
        "station",
    });

  feature.setStyle(
    createPinStyle(
      station,
      station.id ===
        selectedStationId
    )
  );

  return feature;
}

function getRegionLabelGeometry(
  feature
) {
  const geometry =
    feature.getGeometry();

  if (!geometry) {
    return undefined;
  }

  if (
    geometry.getType() ===
    "Polygon"
  ) {
    return geometry.getInteriorPoint();
  }

  if (
    geometry.getType() ===
    "MultiPolygon"
  ) {
    const polygons =
      geometry.getPolygons();

    const largestPolygon =
      polygons.reduce(
        (largest, polygon) =>
          !largest ||
          polygon.getArea() >
            largest.getArea()
            ? polygon
            : largest,
        null
      );

    return largestPolygon
      ?.getInteriorPoint();
  }

  return new Point(
    getCenter(
      geometry.getExtent()
    )
  );
}

function getRegionColor(
  regionIndex,
  isSelected
) {
  const hue = Math.round(
    (Number(regionIndex) *
      137.508) %
      360
  );

  return isSelected
    ? `hsla(${hue}, 88%, 47%, 0.66)`
    : `hsla(${hue}, 74%, 57%, 0.5)`;
}

function getRegionStrokeColor(
  regionIndex,
  isSelected
) {
  const hue = Math.round(
    (Number(regionIndex) *
      137.508) %
      360
  );

  return isSelected
    ? `hsl(${hue}, 92%, 30%)`
    : `hsl(${hue}, 82%, 38%)`;
}

function createRegionStyle(feature) {
  const regionIndex =
    feature.get(
      "regionIndex"
    ) ?? 0;

  const regionId =
    feature.get(
      "regionId"
    ) ?? regionIndex;

  const regionName = String(
    feature.get("name") ?? ""
  ).trim();

  const isSelected =
    feature.get(
      "selected"
    ) === true;

  const cacheKey = [
    "region",
    regionId,
    regionName,
    isSelected
      ? "selected"
      : "default",
  ].join("-");

  if (
    regionStyleCache.has(
      cacheKey
    )
  ) {
    return regionStyleCache.get(
      cacheKey
    );
  }

  const polygonStyle =
    new Style({
      fill: new Fill({
        color: getRegionColor(
          regionIndex,
          isSelected
        ),
      }),

      stroke: new Stroke({
        color: getRegionStrokeColor(
          regionIndex,
          isSelected
        ),

        width: isSelected
          ? 5
          : 2.8,
      }),
    });

  const styles = [
    polygonStyle,
  ];

  if (regionName) {
    styles.push(
      new Style({
        geometry:
          getRegionLabelGeometry,

        text: new Text({
          text: regionName,

          font: isSelected
            ? "700 13px Inter, system-ui, sans-serif"
            : "600 12px Inter, system-ui, sans-serif",

          fill: new Fill({
            color: isSelected
              ? "#ffffff"
              : "#111827",
          }),

          stroke: new Stroke({
            color: isSelected
              ? "rgba(15, 23, 42, 0.96)"
              : "rgba(255, 255, 255, 0.96)",
            width: isSelected
              ? 4
              : 3.5,
          }),

          textAlign: "center",
          textBaseline: "middle",
          overflow: true,
        }),
      })
    );
  }

  regionStyleCache.set(
    cacheKey,
    styles
  );

  return styles;
}

function createRegionFeatures(
  regions
) {
  const parser =
    new GeoJSON();

  const groupedRegions =
    new Map();

  regions.forEach(
    (region, index) => {
      const boundary =
        getRegionBoundary(region);

      if (!boundary) {
        return;
      }

      const polygonFeatures =
        extractPolygonFeatures(
          boundary
        );

      if (
        polygonFeatures.length ===
        0
      ) {
        return;
      }

      const groupKey =
        getRegionGroupKey(
          region,
          index
        );

      const regionId =
        getRegionRecordId(region);

      const regionName =
        getRegionRecordName(region);

      const existingGroup =
        groupedRegions.get(
          groupKey
        );

      if (existingGroup) {
        existingGroup.polygonFeatures.push(
          ...polygonFeatures
        );

        if (
          regionId !== null &&
          regionId !== undefined &&
          !existingGroup.regionIds.some(
            (currentId) =>
              String(currentId) ===
              String(regionId)
          )
        ) {
          existingGroup.regionIds.push(
            regionId
          );
        }

        existingGroup.sourceRegions.push(
          region
        );

        return;
      }

      groupedRegions.set(
        groupKey,
        {
          region,
          regionId,
          regionIds:
            regionId === null ||
            regionId === undefined
              ? []
              : [regionId],
          regionName,
          regionIndex: index,
          polygonFeatures: [
            ...polygonFeatures,
          ],
          sourceRegions: [
            region,
          ],
        }
      );
    }
  );

  return Array.from(
    groupedRegions.values()
  ).flatMap((group) => {
    const dissolvedGeoJson =
      dissolvePolygonFeatures(
        group.polygonFeatures,
        group.regionName
      );

    if (!dissolvedGeoJson) {
      return [];
    }

    try {
      const feature =
        parser.readFeature(
          dissolvedGeoJson,
          {
            dataProjection:
              "EPSG:4326",
            featureProjection:
              "EPSG:3857",
          }
        );

      const mergedRegion = {
        ...group.region,
        id: group.regionId,
        name: group.regionName,
        regionIds:
          group.regionIds,
        sourceRegions:
          group.sourceRegions,
      };

      feature.set(
        "featureType",
        "region"
      );

      feature.set(
        "region",
        mergedRegion
      );

      feature.set(
        "regionId",
        group.regionId
      );

      feature.set(
        "regionIds",
        group.regionIds
      );

      feature.set(
        "name",
        group.regionName
      );

      feature.set(
        "regionIndex",
        group.regionIndex
      );

      feature.set(
        "selected",
        false
      );

      return [feature];
    } catch (error) {
      console.error(
        `${group.regionName} birleştirilmiş geometrisi okunamadı:`,
        error
      );

      return [];
    }
  });
}

async function loadGeoJsonFeatures(
  url,
  featureType
) {
  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      `${url} yüklenemedi. HTTP ${response.status}`
    );
  }

  const geoJson =
    await response.json();

  const parser =
    new GeoJSON();

  const features =
    parser.readFeatures(
      geoJson,
      {
        dataProjection:
          "EPSG:4326",

        featureProjection:
          "EPSG:3857",
      }
    );

  features.forEach(
    (feature) => {
      feature.set(
        "featureType",
        featureType
      );
    }
  );

  return features;
}

function getClusterExtent(
  clusteredFeatures
) {
  if (
    !Array.isArray(
      clusteredFeatures
    ) ||
    clusteredFeatures.length === 0
  ) {
    return null;
  }

  let extent = null;

  clusteredFeatures.forEach(
    (feature) => {
      const featureExtent =
        feature
          .getGeometry()
          ?.getExtent();

      if (!featureExtent) {
        return;
      }

      if (!extent) {
        extent = [
          ...featureExtent,
        ];

        return;
      }

      extent[0] =
        Math.min(
          extent[0],
          featureExtent[0]
        );

      extent[1] =
        Math.min(
          extent[1],
          featureExtent[1]
        );

      extent[2] =
        Math.max(
          extent[2],
          featureExtent[2]
        );

      extent[3] =
        Math.max(
          extent[3],
          featureExtent[3]
        );
    }
  );

  return extent;
}

function getFeatureProperty(
  feature,
  propertyNames
) {
  for (
    const propertyName
    of propertyNames
  ) {
    const value =
      feature.get(
        propertyName
      );

    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      return String(
        value
      ).trim();
    }
  }

  return "";
}

function getFeatureSearchText(
  feature
) {
  return Object.entries(
    feature.getProperties()
  )
    .filter(
      ([key, value]) =>
        key !== "geometry" &&
        value !== null &&
        value !== undefined &&
        typeof value !==
          "object"
    )
    .map(
      ([, value]) =>
        String(value)
    )
    .join(" ");
}

function getFeatureDisplayName(
  feature,
  featureType,
  index
) {
  const propertyNames =
    featureType === "road"
      ? [
          "NAME",
          "name",
          "Name",
          "ROAD_NAME",
          "roadName",
          "YOL_ADI",
          "YOLADI",
        ]
      : [
          "NAME",
          "name",
          "Name",
        ];

  const name =
    getFeatureProperty(
      feature,
      propertyNames
    );

  if (name) {
    return name;
  }

  const id =
    getFeatureProperty(
      feature,
      [
        "ID",
        "id",
        "Id",
      ]
    );

  if (featureType === "poi") {
    return id
      ? `POI ${id}`
      : `POI ${index + 1}`;
  }

  if (
    featureType === "trafo"
  ) {
    return id
      ? `Trafo ${id}`
      : `Trafo ${index + 1}`;
  }

  return id
    ? `Yol ${id}`
    : `Yol ${index + 1}`;
}

function createFeatureSuggestions(
  features,
  featureType,
  normalizedSearch
) {
  const typeLabels = {
    poi: "POI",
    trafo: "Trafo",
    road: "Yol",
  };

  const suggestions = [];

  features.forEach(
    (feature, index) => {
      const label =
        getFeatureDisplayName(
          feature,
          featureType,
          index
        );

      let score =
        getSearchMatchScore(
          label,
          normalizedSearch
        );

      const fullSearchText =
        normalizeText(
          getFeatureSearchText(
            feature
          )
        );

      if (
        !Number.isFinite(
          score
        ) &&
        fullSearchText.includes(
          normalizedSearch
        )
      ) {
        score = 3;
      }

      if (
        !Number.isFinite(
          score
        )
      ) {
        return;
      }

      const id =
        getFeatureProperty(
          feature,
          [
            "ID",
            "id",
            "Id",
          ]
        ) ||
        `${featureType}-${index}`;

      const geometry =
        feature.getGeometry();

      if (!geometry) {
        return;
      }

      const category =
        getFeatureProperty(
          feature,
          [
            "CATEGORY",
            "category",
            "Category",
            "SUB_CATEGORY",
            "subCategory",
          ]
        );

      suggestions.push({
        key:
          `${featureType}-${id}`,

        id,

        type:
          featureType,

        typeLabel:
          typeLabels[
            featureType
          ],

        label,

        description:
          category ||
          `${
            typeLabels[
              featureType
            ]
          } katmanında göster`,

        score,

        coordinate:
          geometry.getType() ===
          "Point"
            ? [
                ...geometry.getCoordinates(),
              ]
            : null,

        extent: [
          ...geometry.getExtent(),
        ],
      });
    }
  );

  return suggestions;
}

export default function ExistingStationsMap({
  searchTerm = "",
  searchSelection = null,
  searchSelectionKey = 0,
  onSearchSuggestionsChange,
  mapStep = 1,
}) {
  const mapElementRef =
    useRef(null);

  const mapRef =
    useRef(null);

  const stationSourceRef =
    useRef(
      new VectorSource()
    );

  const regionSourceRef =
    useRef(
      new VectorSource()
    );

  const poiSourceRef =
    useRef(
      new VectorSource()
    );

  const trafoSourceRef =
    useRef(
      new VectorSource()
    );

  const roadSourceRef =
    useRef(
      new VectorSource()
    );

  const poiClusterSourceRef =
    useRef(
      new Cluster({
        distance: 55,
        minDistance: 24,
        source:
          poiSourceRef.current,
      })
    );

  const trafoClusterSourceRef =
    useRef(
      new Cluster({
        distance: 60,
        minDistance: 26,
        source:
          trafoSourceRef.current,
      })
    );

  const stationLayerRef =
    useRef(null);

  const regionLayerRef =
    useRef(null);

  const poiLayerRef =
    useRef(null);

  const trafoLayerRef =
    useRef(null);

  const roadLayerRef =
    useRef(null);

  const latestRef =
    useRef({
      stations:
        mockChargingStations,

      regions: [],

      source: "mock",

      mapStep,

      selectedStationId:
        null,
    });

  const [
    stations,
    setStations,
  ] = useState(
    mockChargingStations
  );

  const [
    regions,
    setRegions,
  ] = useState([]);

  const [
    source,
    setSource,
  ] = useState("mock");

  const [
    selectedStationId,
    setSelectedStationId,
  ] = useState(null);

  const [
    selectedRegion,
    setSelectedRegion,
  ] = useState(null);

  const [
    regionSummary,
    setRegionSummary,
  ] = useState(null);

  const [
    popupPixel,
    setPopupPixel,
  ] = useState(null);

  const [
    loadingDetailId,
    setLoadingDetailId,
  ] = useState(null);

  const [
    loadingRegionSummary,
    setLoadingRegionSummary,
  ] = useState(false);

  const [
    poiVisible,
    setPoiVisible,
  ] = useState(false);

  const [
    trafoVisible,
    setTrafoVisible,
  ] = useState(false);

  const [
    roadVisible,
    setRoadVisible,
  ] = useState(false);

  const [
    layerStatus,
    setLayerStatus,
  ] = useState({
    poi: "loading",
    trafo: "loading",
    road: "loading",
  });

  const visibleStations =
    useMemo(
      () => stations,
      [stations]
    );

  const selectedStation =
    stations.find(
      (station) =>
        station.id ===
        selectedStationId
    ) ?? null;

  useEffect(() => {
    latestRef.current = {
      stations,
      regions,
      source,
      mapStep,
      selectedStationId,
    };
  }, [
    stations,
    regions,
    source,
    mapStep,
    selectedStationId,
  ]);

  useEffect(() => {
    if (
      !mapElementRef.current ||
      mapRef.current
    ) {
      return;
    }

    const regionLayer =
      new VectorLayer({
        source:
          regionSourceRef.current,

        style:
          createRegionStyle,

        visible: false,

        declutter: true,

        renderBuffer: 100,

        zIndex: 2,
      });

    const roadLayer =
      new VectorLayer({
        source:
          roadSourceRef.current,

        style:
          roadStyle,

        visible: false,

        zIndex: 3,
      });

    const poiLayer =
      new VectorLayer({
        source:
          poiClusterSourceRef.current,

        style: (feature) =>
          createClusterStyle(
            feature,
            "poi"
          ),

        visible: false,

        zIndex: 4,
      });

    const trafoLayer =
      new VectorLayer({
        source:
          trafoClusterSourceRef.current,

        style: (feature) =>
          createClusterStyle(
            feature,
            "trafo"
          ),

        visible: false,

        zIndex: 4,
      });

    const stationLayer =
      new VectorLayer({
        source:
          stationSourceRef.current,

        zIndex: 6,
      });

    const map =
      new OlMap({
        target:
          mapElementRef.current,

        layers: [
          new TileLayer({
            source:
              new OSM(),
          }),

          regionLayer,
          roadLayer,
          poiLayer,
          trafoLayer,
          stationLayer,
        ],

        view: new View({
          center:
            CANKAYA_CENTER,

          zoom: 12.4,

          minZoom: 10.5,

          maxZoom: 18,
        }),

        controls: [],
      });

    map.on(
      "moveend",
      () => {
        const station =
          latestRef.current
            .stations
            .find(
              (item) =>
                item.id ===
                latestRef.current
                  .selectedStationId
            );

        if (!station) {
          return;
        }

        setPopupPixel(
          map.getPixelFromCoordinate(
            fromLonLat([
              station.longitude,
              station.latitude,
            ])
          )
        );
      }
    );

    map.on(
      "singleclick",
      (event) => {
        const feature =
          map.forEachFeatureAtPixel(
            event.pixel,

            (item) => item,

            {
              hitTolerance: 7,
            }
          );

        if (!feature) {
          return;
        }

        const featureType =
          feature.get(
            "featureType"
          );

        if (
          featureType ===
          "station"
        ) {
          selectStation(
            feature.get(
              "station"
            )?.id
          );

          return;
        }

        if (
          latestRef.current
            .mapStep > 1 &&
          featureType ===
            "region"
        ) {
          selectRegion(
            feature.get(
              "regionId"
            )
          );

          return;
        }

        const clusteredFeatures =
          feature.get(
            "features"
          );

        if (
          Array.isArray(
            clusteredFeatures
          ) &&
          clusteredFeatures.length >
            1
        ) {
          const extent =
            getClusterExtent(
              clusteredFeatures
            );

          if (extent) {
            map
              .getView()
              .fit(
                extent,
                {
                  padding: [
                    90,
                    90,
                    90,
                    90,
                  ],

                  duration: 350,

                  maxZoom: 17,
                }
              );
          }
        }
      }
    );

    mapRef.current = map;

    regionLayerRef.current =
      regionLayer;

    roadLayerRef.current =
      roadLayer;

    poiLayerRef.current =
      poiLayer;

    trafoLayerRef.current =
      trafoLayer;

    stationLayerRef.current =
      stationLayer;

    return () => {
      map.setTarget(
        undefined
      );

      mapRef.current = null;

      regionLayerRef.current =
        null;

      roadLayerRef.current =
        null;

      poiLayerRef.current =
        null;

      trafoLayerRef.current =
        null;

      stationLayerRef.current =
        null;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadMapData() {
      try {
        const [
          stationData,
          regionData,
        ] =
          await Promise.all([
            getChargingStations(),
            getRegions(),
          ]);

        if (!isMounted) {
          return;
        }

        const safeRegions =
          Array.isArray(
            regionData
          )
            ? regionData
            : [];

        const safeStations =
          Array.isArray(
            stationData
          )
            ? stationData
            : [];

        const mergedRegions =
          mergeRegionsByName(
            safeRegions
          );

        const regionLookup =
          new Map(
            safeRegions.flatMap(
              (region) => {
                const regionName =
                  getRegionRecordName(
                    region
                  );

                const regionIds = [
                  getRegionRecordId(
                    region
                  ),
                  ...(Array.isArray(
                    region.regionIds
                  )
                    ? region.regionIds
                    : []),
                ].filter(
                  (regionId) =>
                    regionId !== null &&
                    regionId !== undefined
                );

                return regionIds.map(
                  (regionId) => [
                    regionId,
                    regionName,
                  ]
                );
              }
            )
          );

        setRegions(
          mergedRegions
        );

        setStations(
          safeStations.map(
            (station) =>
              normalizeStation(
                station,
                regionLookup
              )
          )
        );

        setSource("api");
      } catch (error) {
        console.error(
          "Harita API verileri alınamadı:",
          error
        );

        if (!isMounted) {
          return;
        }

        setRegions([]);

        setStations(
          mockChargingStations
        );

        setSource("mock");
      }
    }

    loadMapData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadAllGeoJsonLayers() {
      const layerDefinitions = [
        {
          key: "poi",
          url:
            GEOJSON_URLS.poi,
          sourceRef:
            poiSourceRef,
        },
        {
          key: "trafo",
          url:
            GEOJSON_URLS.trafo,
          sourceRef:
            trafoSourceRef,
        },
        {
          key: "road",
          url:
            GEOJSON_URLS.road,
          sourceRef:
            roadSourceRef,
        },
      ];

      await Promise.all(
        layerDefinitions.map(
          async ({
            key,
            url,
            sourceRef,
          }) => {
            try {
              const features =
                await loadGeoJsonFeatures(
                  url,
                  key
                );

              if (!isMounted) {
                return;
              }

              sourceRef.current.clear();

              sourceRef.current.addFeatures(
                features
              );

              setLayerStatus(
                (current) => ({
                  ...current,

                  [key]:
                    "ready",
                })
              );
            } catch (error) {
              console.error(
                error
              );

              if (!isMounted) {
                return;
              }

              setLayerStatus(
                (current) => ({
                  ...current,

                  [key]:
                    "error",
                })
              );
            }
          }
        )
      );
    }

    loadAllGeoJsonLayers();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const normalizedSearch =
      normalizeText(
        searchTerm
      );

    if (
      normalizedSearch.length < 2
    ) {
      onSearchSuggestionsChange?.(
        []
      );

      return;
    }

    const timeoutId =
      window.setTimeout(
        () => {
          const stationSuggestions =
            stations
              .map((station) => {
                const searchableText =
                  [
                    station.name,
                    station.district,
                    station.neighborhood,
                    station.address,
                    station.socketType,
                  ]
                    .filter(Boolean)
                    .join(" ");

                let score =
                  getSearchMatchScore(
                    station.name,
                    normalizedSearch
                  );

                if (
                  !Number.isFinite(
                    score
                  ) &&
                  normalizeText(
                    searchableText
                  ).includes(
                    normalizedSearch
                  )
                ) {
                  score = 3;
                }

                return {
                  key:
                    `station-${station.id}`,

                  id:
                    station.id,

                  type:
                    "station",

                  typeLabel:
                    "İstasyon",

                  label:
                    station.name,

                  description:
                    station.address,

                  score,

                  stationId:
                    station.id,

                  longitude:
                    station.longitude,

                  latitude:
                    station.latitude,
                };
              })
              .filter(
                (suggestion) =>
                  Number.isFinite(
                    suggestion.score
                  )
              );

          const regionSuggestions =
            regions
              .map((region) => {
                const feature =
                  regionSourceRef.current
                    .getFeatures()
                    .find(
                      (
                        currentFeature
                      ) =>
                        String(
                          currentFeature.get(
                            "regionId"
                          )
                        ) ===
                        String(
                          region.id
                        )
                    );

                return {
                  key:
                    `region-${region.id}`,

                  id:
                    region.id,

                  type:
                    "region",

                  typeLabel:
                    "Mahalle",

                  label:
                    region.name,

                  description:
                    "Mahalle sınırını haritada göster",

                  score:
                    getSearchMatchScore(
                      region.name,
                      normalizedSearch
                    ),

                  regionId:
                    region.id,

                  extent:
                    feature
                      ?.getGeometry()
                      ?.getExtent()
                      ? [
                          ...feature
                            .getGeometry()
                            .getExtent(),
                        ]
                      : null,
                };
              })
              .filter(
                (suggestion) =>
                  Number.isFinite(
                    suggestion.score
                  )
              );

          const placeSuggestions =
            PLACE_SEARCH_PRESETS
              .map((place) => {
                const aliasScores =
                  place.aliases.map(
                    (alias) =>
                      getSearchMatchScore(
                        alias,
                        normalizedSearch
                      )
                  );

                const score =
                  Math.min(
                    getSearchMatchScore(
                      place.label,
                      normalizedSearch
                    ),

                    ...aliasScores
                  );

                return {
                  key:
                    `place-${place.id}`,

                  id:
                    place.id,

                  type:
                    "place",

                  typeLabel:
                    "Konum",

                  label:
                    place.label,

                  description:
                    "Haritada konuma git",

                  score,

                  longitude:
                    place.longitude,

                  latitude:
                    place.latitude,

                  zoom:
                    place.zoom,
                };
              })
              .filter(
                (suggestion) =>
                  Number.isFinite(
                    suggestion.score
                  )
              );

          const poiSuggestions =
            createFeatureSuggestions(
              poiSourceRef.current
                .getFeatures(),

              "poi",

              normalizedSearch
            );

          const trafoSuggestions =
            createFeatureSuggestions(
              trafoSourceRef.current
                .getFeatures(),

              "trafo",

              normalizedSearch
            );

          const roadSuggestions =
            createFeatureSuggestions(
              roadSourceRef.current
                .getFeatures(),

              "road",

              normalizedSearch
            );

          const typePriority = {
            station: 0,
            region: 1,
            place: 2,
            poi: 3,
            trafo: 4,
            road: 5,
          };

          const suggestions = [
            ...stationSuggestions,
            ...regionSuggestions,
            ...placeSuggestions,
            ...poiSuggestions,
            ...trafoSuggestions,
            ...roadSuggestions,
          ]
            .sort(
              (
                first,
                second
              ) => {
                if (
                  first.score !==
                  second.score
                ) {
                  return (
                    first.score -
                    second.score
                  );
                }

                const priorityDifference =
                  typePriority[
                    first.type
                  ] -
                  typePriority[
                    second.type
                  ];

                if (
                  priorityDifference !==
                  0
                ) {
                  return priorityDifference;
                }

                return first.label.localeCompare(
                  second.label,
                  "tr-TR"
                );
              }
            )
            .slice(0, 8);

          onSearchSuggestionsChange?.(
            suggestions
          );
        },
        180
      );

    return () => {
      window.clearTimeout(
        timeoutId
      );
    };
  }, [
    searchTerm,
    stations,
    regions,
    layerStatus.poi,
    layerStatus.trafo,
    layerStatus.road,
    onSearchSuggestionsChange,
  ]);

  useEffect(() => {
    if (
      searchSelectionKey === 0 ||
      !mapRef.current
    ) {
      return;
    }

    const map =
      mapRef.current;

    async function applySearchSelection() {
      if (!searchSelection) {
        setSelectedStationId(
          null
        );

        setPopupPixel(null);

        setSelectedRegion(null);

        setRegionSummary(null);

        regionSourceRef.current
          .getFeatures()
          .forEach(
            (feature) => {
              feature.set(
                "selected",
                false
              );

              feature.changed();
            }
          );

        if (
          latestRef.current
            .source === "api"
        ) {
          try {
            const stationData =
              await getChargingStations();

            const safeStations =
              Array.isArray(
                stationData
              )
                ? stationData
                : [];

            const regionLookup =
              new Map(
                latestRef.current
                  .regions
                  .map(
                    (region) => [
                      region.id,
                      region.name,
                    ]
                  )
              );

            setStations(
              safeStations.map(
                (station) =>
                  normalizeStation(
                    station,
                    regionLookup
                  )
              )
            );
          } catch (error) {
            console.error(
              "İstasyonlar yenilenemedi:",
              error
            );
          }
        } else {
          setStations(
            mockChargingStations
          );
        }

        if (
          latestRef.current
            .mapStep > 1
        ) {
          const extent =
            regionSourceRef.current
              .getExtent();

          if (
            extent &&
            Number.isFinite(
              extent[0]
            )
          ) {
            map.getView().fit(
              extent,
              {
                padding: [
                  110,
                  110,
                  80,
                  110,
                ],

                maxZoom:
                  12.2,

                duration:
                  350,
              }
            );

            return;
          }
        }

        map.getView().animate({
          center:
            CANKAYA_CENTER,

          zoom: 12.4,

          duration: 350,
        });

        return;
      }

      if (
        searchSelection.type ===
        "station"
      ) {
        await selectStation(
          searchSelection.stationId
        );

        map.getView().animate({
          center:
            fromLonLat([
              Number(
                searchSelection.longitude
              ),

              Number(
                searchSelection.latitude
              ),
            ]),

          zoom: 16,

          duration: 450,
        });

        return;
      }

      if (
        searchSelection.type ===
        "region"
      ) {
        if (
          latestRef.current
            .mapStep > 1
        ) {
          await selectRegion(
            searchSelection.regionId
          );

          return;
        }

        if (
          searchSelection.extent
        ) {
          map.getView().fit(
            searchSelection.extent,
            {
              padding: [
                100,
                220,
                100,
                100,
              ],

              maxZoom: 15,

              duration: 450,
            }
          );
        }

        return;
      }

      setSelectedStationId(
        null
      );

      setPopupPixel(null);

      if (
        searchSelection.type ===
        "place"
      ) {
        map.getView().animate({
          center:
            fromLonLat([
              searchSelection.longitude,
              searchSelection.latitude,
            ]),

          zoom:
            searchSelection.zoom ||
            16,

          duration: 450,
        });

        return;
      }

      if (
        searchSelection.type ===
        "poi"
      ) {
        setPoiVisible(true);

        setTrafoVisible(false);

        if (
          searchSelection.coordinate
        ) {
          map.getView().animate({
            center:
              searchSelection.coordinate,

            zoom: 17,

            duration: 450,
          });
        }

        return;
      }

      if (
        searchSelection.type ===
        "trafo"
      ) {
        setTrafoVisible(true);

        setPoiVisible(false);

        if (
          searchSelection.coordinate
        ) {
          map.getView().animate({
            center:
              searchSelection.coordinate,

            zoom: 17,

            duration: 450,
          });
        }

        return;
      }

      if (
        searchSelection.type ===
          "road" &&
        searchSelection.extent
      ) {
        setRoadVisible(true);

        map.getView().fit(
          searchSelection.extent,
          {
            padding: [
              100,
              100,
              100,
              100,
            ],

            maxZoom: 16,

            duration: 450,
          }
        );
      }
    }

    applySearchSelection();
  }, [
    searchSelection,
    searchSelectionKey,
  ]);

  useEffect(() => {
    const features =
      visibleStations
        .map(
          (station) =>
            createStationFeature(
              station,
              selectedStationId
            )
        )
        .filter(Boolean);

    stationSourceRef.current.clear();

    stationSourceRef.current.addFeatures(
      features
    );
  }, [
    visibleStations,
    selectedStationId,
  ]);

  useEffect(() => {
    const features =
      createRegionFeatures(
        regions
      );

    regionSourceRef.current.clear();

    regionSourceRef.current.addFeatures(
      features
    );
  }, [regions]);

  useEffect(() => {
    poiLayerRef.current
      ?.setVisible(
        poiVisible
      );
  }, [poiVisible]);

  useEffect(() => {
    trafoLayerRef.current
      ?.setVisible(
        trafoVisible
      );
  }, [trafoVisible]);

  useEffect(() => {
    roadLayerRef.current
      ?.setVisible(
        roadVisible
      );
  }, [roadVisible]);

  useEffect(() => {
    const active =
      mapStep > 1;

    regionLayerRef.current
      ?.setVisible(
        active
      );

    if (!active) {
      setSelectedRegion(null);

      setRegionSummary(null);

      regionSourceRef.current
        .getFeatures()
        .forEach(
          (feature) => {
            feature.set(
              "selected",
              false
            );

            feature.changed();
          }
        );

      return;
    }

    setSelectedStationId(
      null
    );

    setPopupPixel(null);

    const extent =
      regionSourceRef.current
        .getExtent();

    if (
      extent &&
      Number.isFinite(
        extent[0]
      ) &&
      mapRef.current
    ) {
      mapRef.current
        .getView()
        .fit(
          extent,
          {
            padding: [
              110,
              110,
              80,
              110,
            ],

            maxZoom: 12.2,

            duration: 350,
          }
        );
    }
  }, [
    mapStep,
    regions,
  ]);

  useEffect(() => {
    if (
      !selectedStation ||
      !mapRef.current
    ) {
      setPopupPixel(null);

      return;
    }

    setPopupPixel(
      mapRef.current
        .getPixelFromCoordinate(
          fromLonLat([
            selectedStation.longitude,
            selectedStation.latitude,
          ])
        )
    );
  }, [selectedStation]);

  async function selectStation(
    stationId
  ) {
    if (!stationId) {
      return;
    }

    setSelectedStationId(
      stationId
    );

    const station =
      latestRef.current
        .stations
        .find(
          (item) =>
            String(item.id) === String(stationId)
        );

    if (
      station &&
      mapRef.current
    ) {
      setPopupPixel(
        mapRef.current
          .getPixelFromCoordinate(
            fromLonLat([
              station.longitude,
              station.latitude,
            ])
          )
      );
    }

    if (
      latestRef.current
        .source !== "api"
    ) {
      return;
    }

    setLoadingDetailId(
      stationId
    );

    try {
      const detailResponse =
        await getChargingStationDetail(
          stationId
        );

      const detail =
        detailResponse?.data ??
        detailResponse?.result ??
        detailResponse;

      const regionLookup =
        new Map(
          latestRef.current
            .regions
            .map(
              (region) => [
                region.id,
                region.name,
              ]
            )
        );

      const normalizedDetail =
        normalizeStation(
          {
            ...station,
            ...detail,
          },
          regionLookup
        );

      setStations(
        (
          currentStations
        ) =>
          currentStations.map(
            (item) =>
              String(item.id) === String(stationId)
                ? normalizedDetail
                : item
          )
      );
    } catch (error) {
      console.error(
        "İstasyon detay bilgisi alınamadı:",
        error
      );
    } finally {
      setLoadingDetailId(
        null
      );
    }
  }

  async function selectRegion(
    regionId
  ) {
    if (!regionId) {
      return;
    }

    const region =
      latestRef.current
        .regions
        .find(
          (item) =>
            String(item.id) ===
            String(regionId)
        );

    if (!region) {
      return;
    }

    setSelectedRegion(
      region
    );

    setSelectedStationId(
      null
    );

    setPopupPixel(null);

    setRegionSummary(null);

    setLoadingRegionSummary(
      true
    );

    let selectedFeature =
      null;

    regionSourceRef.current
      .getFeatures()
      .forEach(
        (feature) => {
          const isSelected =
            String(
              feature.get(
                "regionId"
              )
            ) ===
            String(regionId);

          feature.set(
            "selected",
            isSelected
          );

          feature.changed();

          if (isSelected) {
            selectedFeature =
              feature;
          }
        }
      );

    const extent =
      selectedFeature
        ?.getGeometry()
        ?.getExtent();

    if (
      extent &&
      mapRef.current
    ) {
      mapRef.current
        .getView()
        .fit(
          extent,
          {
            padding: [
              86,
              360,
              72,
              92,
            ],

            maxZoom: 14.8,

            duration: 350,
          }
        );
    }

    if (
      latestRef.current
        .source !== "api"
    ) {
      setRegionSummary({
        regionId,

        regionName:
          region.name,

        chargingStationCount:
          visibleStations.length,

        trafficLevel:
          "Mock veri",

        mostCommonSocketType:
          "CCS",

        mostCommonPowerKw:
          180,

        companyDistribution:
          [],
      });

      setLoadingRegionSummary(
        false
      );

      return;
    }

    try {
      const [
        summary,
        stationData,
      ] =
        await Promise.all([
          getRegionSummary(
            regionId
          ),

          getChargingStations(
            regionId
          ),
        ]);

      const safeStations =
        Array.isArray(
          stationData
        )
          ? stationData
          : [];

      const regionLookup =
        new Map(
          latestRef.current
            .regions
            .map(
              (item) => [
                item.id,
                item.name,
              ]
            )
        );

      setRegionSummary(
        summary
      );

      setStations(
        safeStations.map(
          (station) =>
            normalizeStation(
              station,
              regionLookup
            )
        )
      );
    } catch (error) {
      console.error(
        "Bölge detay bilgisi alınamadı:",
        error
      );

      setRegionSummary({
        regionId,

        regionName:
          region.name,

        chargingStationCount:
          0,

        trafficLevel:
          "Veri alınamadı",

        mostCommonSocketType:
          null,

        mostCommonPowerKw:
          null,

        companyDistribution:
          [],
      });
    } finally {
      setLoadingRegionSummary(
        false
      );
    }
  }

  async function clearRegionSelection(
    restoreStations = true
  ) {
    setSelectedRegion(null);

    setRegionSummary(null);

    setSelectedStationId(
      null
    );

    setPopupPixel(null);

    regionSourceRef.current
      .getFeatures()
      .forEach(
        (feature) => {
          feature.set(
            "selected",
            false
          );

          feature.changed();
        }
      );

    if (mapRef.current) {
      if (mapStep > 1) {
        const extent =
          regionSourceRef.current
            .getExtent();

        if (
          extent &&
          Number.isFinite(
            extent[0]
          )
        ) {
          mapRef.current
            .getView()
            .fit(
              extent,
              {
                padding: [
                  110,
                  110,
                  80,
                  110,
                ],

                maxZoom: 12.2,

                duration: 300,
              }
            );
        }
      } else {
        mapRef.current
          .getView()
          .animate({
            center:
              CANKAYA_CENTER,

            zoom: 12.4,

            duration: 300,
          });
      }
    }

    if (!restoreStations) {
      return;
    }

    if (
      latestRef.current
        .source !== "api"
    ) {
      setStations(
        mockChargingStations
      );

      return;
    }

    try {
      const stationData =
        await getChargingStations();

      const safeStations =
        Array.isArray(
          stationData
        )
          ? stationData
          : [];

      const regionLookup =
        new Map(
          latestRef.current
            .regions
            .map(
              (item) => [
                item.id,
                item.name,
              ]
            )
        );

      setStations(
        safeStations.map(
          (station) =>
            normalizeStation(
              station,
              regionLookup
            )
        )
      );
    } catch (error) {
      console.error(
        "İstasyon listesi yenilenemedi:",
        error
      );

      setStations(
        mockChargingStations
      );
    }
  }

  function getLayerButtonText(
    label,
    status,
    active
  ) {
    if (
      status === "loading"
    ) {
      return `${label} yükleniyor`;
    }

    if (
      status === "error"
    ) {
      return `${label} bulunamadı`;
    }

    return active
      ? `${label} açık`
      : `${label} kapalı`;
  }

  return (
    <div
      className="existing-map"
      data-testid="existing-stations-map"
    >
      <div
        ref={mapElementRef}
        className="openlayers-map"
        data-testid="existing-stations-map-canvas"
      />

      <div
        className="map-layer-controls"
        data-testid="map-layer-controls"
      >
        <strong>
          Harita Katmanları
        </strong>

        <button
          type="button"
          className={
            poiVisible
              ? "map-layer-button active poi"
              : "map-layer-button poi"
          }
          disabled={
            layerStatus.poi !==
            "ready"
          }
          onClick={() =>
            setPoiVisible(
              (current) =>
                !current
            )
          }
          data-testid="poi-layer-toggle"
        >
          <span className="layer-symbol poi-symbol" />

          {getLayerButtonText(
            "POI",
            layerStatus.poi,
            poiVisible
          )}
        </button>

        <button
          type="button"
          className={
            trafoVisible
              ? "map-layer-button active trafo"
              : "map-layer-button trafo"
          }
          disabled={
            layerStatus.trafo !==
            "ready"
          }
          onClick={() =>
            setTrafoVisible(
              (current) =>
                !current
            )
          }
          data-testid="trafo-layer-toggle"
        >
          <span className="layer-symbol trafo-symbol" />

          {getLayerButtonText(
            "Trafo",
            layerStatus.trafo,
            trafoVisible
          )}
        </button>

        <button
          type="button"
          className={
            roadVisible
              ? "map-layer-button active road"
              : "map-layer-button road"
          }
          disabled={
            layerStatus.road !==
            "ready"
          }
          onClick={() =>
            setRoadVisible(
              (current) =>
                !current
            )
          }
          data-testid="road-layer-toggle"
        >
          <span className="layer-symbol road-symbol" />

          {getLayerButtonText(
            "Yol",
            layerStatus.road,
            roadVisible
          )}
        </button>
      </div>

      <div
        className="map-step-badge"
        data-testid="existing-map-step-badge"
      >
        {mapStep === 1 &&
          "1 / Mevcut istasyonlar"}

        {mapStep === 2 &&
          "2 / Bölgeler aktif"}

        {mapStep === 3 &&
          "3 / Bölge detayı"}
      </div>

      {mapStep > 1 &&
        selectedRegion && (
          <>
            <aside
              className="region-summary-card"
              data-testid="region-summary-card"
            >
              <header>
                <strong
                  data-testid="selected-region-summary-name"
                >
                  {regionSummary
                    ?.regionName ||
                    selectedRegion.name}
                </strong>

                <span>
                  Semt Bilgi Paneli
                </span>
              </header>

              {loadingRegionSummary ? (
                <p
                  className="region-summary-loading"
                  data-testid="region-summary-loading"
                >
                  Yükleniyor...
                </p>
              ) : (
                <div className="region-summary-content">
                  <dl>
                    <div>
                      <dt>
                        İstasyon
                      </dt>

                      <dd data-testid="region-summary-station-count">
                        {regionSummary
                          ?.chargingStationCount ??
                          0}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Trafik
                      </dt>

                      <dd data-testid="region-summary-traffic-level">
                        {regionSummary
                          ?.trafficLevel ||
                          "Veri yok"}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Yaygın Soket
                      </dt>

                      <dd data-testid="region-summary-socket-type">
                        {regionSummary
                          ?.mostCommonSocketType ||
                          "Veri yok"}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Yaygın Güç
                      </dt>

                      <dd data-testid="region-summary-power">
                        {regionSummary
                          ?.mostCommonPowerKw
                          ? `${regionSummary.mostCommonPowerKw} kW`
                          : "Veri yok"}
                      </dd>
                    </div>
                  </dl>

                  <div className="company-distribution">
                    <span>
                      Firma Dağılımı
                    </span>

                    {(
                      regionSummary
                        ?.companyDistribution ||
                      []
                    )
                      .slice(0, 4)
                      .map(
                        (
                          company,
                          index
                        ) => (
                          <p
                            key={
                              company.companyName
                            }
                            data-testid={`region-company-${index}`}
                          >
                            <strong>
                              {
                                company.companyName
                              }
                            </strong>

                            <em>
                              {
                                company.stationCount
                              }
                            </em>
                          </p>
                        )
                      )}

                    {(
                      regionSummary
                        ?.companyDistribution ||
                      []
                    ).length ===
                      0 && (
                      <p data-testid="region-company-empty">
                        <strong>
                          Veri yok
                        </strong>

                        <em>
                          -
                        </em>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </aside>

            <button
              type="button"
              className="region-back-button"
              onClick={() =>
                clearRegionSelection(
                  true
                )
              }
              data-testid="region-back-button"
            >
              Bölgelere geri dön
            </button>
          </>
        )}

      <div
        className="existing-station-popup"
        data-testid="existing-station-popup"
        style={
          selectedStation &&
          popupPixel
            ? {
                left:
                  `${
                    popupPixel[0] +
                    16
                  }px`,

                top:
                  `${
                    popupPixel[1] -
                    12
                  }px`,
              }
            : undefined
        }
      >
        {selectedStation && (
          <>
            <div>
              <span data-testid="selected-station-neighborhood">
                {
                  selectedStation.neighborhood
                }
              </span>

              <strong data-testid="selected-station-status">
                {
                  selectedStation.status
                }
              </strong>
            </div>

            <h2 data-testid="selected-station-name">
              {
                selectedStation.name
              }
            </h2>

            <p data-testid="selected-station-address">
              {
                selectedStation.address
              }
            </p>

            <dl>
              <div>
                <dt>
                  Soket
                </dt>

                <dd data-testid="selected-station-socket">
                  {loadingDetailId ===
                  selectedStation.id
                    ? "Yükleniyor..."
                    : selectedStation.socketType}
                </dd>
              </div>

              <div>
                <dt>
                  Güç
                </dt>

                <dd data-testid="selected-station-power">
                  {
                    selectedStation.power
                  }
                </dd>
              </div>
            </dl>
          </>
        )}
      </div>

      <div
        className="existing-map-source"
        data-testid="existing-map-source"
      >
        {source === "api"
          ? "Canlı veri"
          : "Mock veri"}
      </div>
    </div>
  );
}