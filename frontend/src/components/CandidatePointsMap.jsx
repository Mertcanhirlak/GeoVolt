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
import Point from "ol/geom/Point";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import Select from "ol/interaction/Select";
import {
  click,
} from "ol/events/condition";
import {
  getCenter,
} from "ol/extent";
import {
  fromLonLat,
  toLonLat,
} from "ol/proj";
import Cluster from "ol/source/Cluster";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";

import {
  Circle as CircleStyle,
  Fill,
  Stroke,
  Style,
  Text,
} from "ol/style";

import "ol/ol.css";

import {
  getRegions,
} from "../services/regionsApi";

import "./CandidatePointsMap.css";

const CANKAYA_CENTER =
  fromLonLat([
    32.8541,
    39.9208,
  ]);

const CANKAYA_BOUNDS = {
  minLatitude: 39.72,
  maxLatitude: 40.08,
  minLongitude: 32.5,
  maxLongitude: 33.18,
};

const CANDIDATE_REGION_LABEL_MAX_RESOLUTION =
  12;

const GEOJSON_URLS = {
  poi: "/data/POI.geojson",
  trafo: "/data/TRAFO.geojson",
  road: "/data/YOL.geojson",
};

const regionColors = [
  "rgba(74, 222, 128, 0.46)",
  "rgba(96, 165, 250, 0.43)",
  "rgba(250, 204, 21, 0.45)",
  "rgba(248, 113, 113, 0.42)",
  "rgba(192, 132, 252, 0.43)",
  "rgba(45, 212, 191, 0.43)",
];

const candidateStyleCache =
  new Map();

const candidateClusterStyleCache =
  new Map();

const candidateRegionStyleCache =
  new Map();

const poiClusterStyleCache =
  new Map();

const trafoClusterStyleCache =
  new Map();

const manualPinStyle =
  new Style({
    image: new CircleStyle({
      radius: 14,

      fill: new Fill({
        color: "#7c3aed",
      }),

      stroke: new Stroke({
        color: "#ffffff",
        width: 3,
      }),
    }),

    text: new Text({
      text: "M",

      fill: new Fill({
        color: "#ffffff",
      }),

      stroke: new Stroke({
        color:
          "rgba(15, 23, 42, 0.85)",
        width: 2,
      }),

      font:
        "bold 12px Arial",
    }),
  });

const singlePoiStyle =
  new Style({
    image: new CircleStyle({
      radius: 6,

      fill: new Fill({
        color:
          "rgba(15, 23, 42, 0.95)",
      }),

      stroke: new Stroke({
        color: "#ffffff",
        width: 2,
      }),
    }),
  });

const singleTrafoStyle =
  new Style({
    image: new CircleStyle({
      radius: 6,

      fill: new Fill({
        color:
          "rgba(234, 88, 12, 0.96)",
      }),

      stroke: new Stroke({
        color: "#ffffff",
        width: 2,
      }),
    }),
  });

const roadStyle =
  new Style({
    stroke: new Stroke({
      color:
        "rgba(37, 99, 235, 0.42)",
      width: 1.3,
    }),
  });

function getRegionId(region) {
  return (
    region?.id ??
    region?.Id ??
    region?.ID ??
    region?.regionId ??
    region?.RegionId ??
    region?.regionID ??
    region?.RegionID ??
    region?.gid ??
    region?.GID ??
    null
  );
}

function getRegionName(region) {
  return (
    region?.name ??
    region?.Name ??
    region?.NAME ??
    region?.regionName ??
    region?.RegionName ??
    region?.region_name ??
    region?.SEMT ??
    region?.semt ??
    "Seçilen Bölge"
  );
}

function extractRegionList(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (
    Array.isArray(
      result?.data
    )
  ) {
    return result.data;
  }

  if (
    Array.isArray(
      result?.items
    )
  ) {
    return result.items;
  }

  if (
    Array.isArray(
      result?.result
    )
  ) {
    return result.result;
  }

  if (
    Array.isArray(
      result?.value
    )
  ) {
    return result.value;
  }

  if (
    Array.isArray(
      result?.data?.items
    )
  ) {
    return result.data.items;
  }

  if (
    Array.isArray(
      result?.data?.regions
    )
  ) {
    return result.data.regions;
  }

  return [];
}

function isInsideCankaya(
  latitude,
  longitude
) {
  return (
    latitude >=
      CANKAYA_BOUNDS.minLatitude &&
    latitude <=
      CANKAYA_BOUNDS.maxLatitude &&
    longitude >=
      CANKAYA_BOUNDS.minLongitude &&
    longitude <=
      CANKAYA_BOUNDS.maxLongitude
  );
}

function normalizeCandidateForMap(
  candidate
) {
  let latitude =
    Number(
      candidate?.latitude
    );

  let longitude =
    Number(
      candidate?.longitude
    );

  if (
    !Number.isFinite(
      latitude
    ) ||
    !Number.isFinite(
      longitude
    )
  ) {
    return null;
  }

  const directInsideCankaya =
    isInsideCankaya(
      latitude,
      longitude
    );

  const swappedInsideCankaya =
    isInsideCankaya(
      longitude,
      latitude
    );

  if (
    !directInsideCankaya &&
    swappedInsideCankaya
  ) {
    const previousLatitude =
      latitude;

    latitude = longitude;
    longitude =
      previousLatitude;
  }

  if (
    !isInsideCankaya(
      latitude,
      longitude
    )
  ) {
    return null;
  }

  return {
    ...candidate,
    latitude,
    longitude,
  };
}

function getCandidateColor(
  generalScore
) {
  const score =
    Number(generalScore);

  if (
    !Number.isFinite(
      score
    )
  ) {
    return "#64748b";
  }

  if (score >= 80) {
    return "#16a34a";
  }

  if (score >= 50) {
    return "#f59e0b";
  }

  return "#dc2626";
}

function createCandidateStyle(
  candidate,
  isSelected
) {
  const scoreText =
    candidate.generalScore ===
      null ||
    candidate.generalScore ===
      undefined
      ? "?"
      : String(
          candidate.generalScore
        );

  const color =
    isSelected
      ? "#2563eb"
      : getCandidateColor(
          candidate.generalScore
        );

  const cacheKey = [
    color,
    scoreText,
    isSelected
      ? "selected"
      : "default",
  ].join("-");

  if (
    candidateStyleCache.has(
      cacheKey
    )
  ) {
    return candidateStyleCache.get(
      cacheKey
    );
  }

  const style =
    new Style({
      image:
        new CircleStyle({
          radius:
            isSelected
              ? 14
              : 11,

          fill:
            new Fill({
              color,
            }),

          stroke:
            new Stroke({
              color:
                "#ffffff",

              width:
                isSelected
                  ? 3
                  : 2,
            }),
        }),

      text: new Text({
        text:
          scoreText,

        fill:
          new Fill({
            color:
              "#ffffff",
          }),

        stroke:
          new Stroke({
            color:
              "rgba(15, 23, 42, 0.78)",

            width: 2,
          }),

        font:
          isSelected
            ? "bold 12px Arial"
            : "bold 10px Arial",
      }),
    });

  candidateStyleCache.set(
    cacheKey,
    style
  );

  return style;
}

function createCandidateClusterStyle(
  feature,
  selectedPointId
) {
  const clusteredFeatures =
    feature.get(
      "features"
    ) ?? [];

  const size =
    clusteredFeatures.length;

  if (size === 0) {
    return undefined;
  }

  if (size === 1) {
    const candidate =
      clusteredFeatures[0].get(
        "candidate"
      );

    if (!candidate) {
      return undefined;
    }

    return createCandidateStyle(
      candidate,
      String(candidate.id) ===
        String(
          selectedPointId
        )
    );
  }

  const containsSelectedCandidate =
    selectedPointId !== null &&
    selectedPointId !==
      undefined &&
    clusteredFeatures.some(
      (
        candidateFeature
      ) =>
        String(
          candidateFeature.get(
            "candidateId"
          )
        ) ===
        String(
          selectedPointId
        )
    );

  const radius =
    size > 99
      ? 22
      : size > 49
        ? 20
        : size > 19
          ? 18
          : size > 9
            ? 16
            : 14;

  const cacheKey = [
    size,
    radius,
    containsSelectedCandidate
      ? "selected"
      : "default",
  ].join("-");

  if (
    candidateClusterStyleCache.has(
      cacheKey
    )
  ) {
    return candidateClusterStyleCache.get(
      cacheKey
    );
  }

  const style =
    new Style({
      image:
        new CircleStyle({
          radius,

          fill:
            new Fill({
              color:
                containsSelectedCandidate
                  ? "rgba(37, 99, 235, 0.96)"
                  : "rgba(15, 118, 110, 0.94)",
            }),

          stroke:
            new Stroke({
              color:
                "#ffffff",

              width:
                containsSelectedCandidate
                  ? 4
                  : 3,
            }),
        }),

      text: new Text({
        text:
          String(size),

        fill:
          new Fill({
            color:
              "#ffffff",
          }),

        stroke:
          new Stroke({
            color:
              "rgba(15, 23, 42, 0.82)",

            width: 2,
          }),

        font:
          containsSelectedCandidate
            ? "bold 13px Arial"
            : "bold 12px Arial",
      }),
    });

  candidateClusterStyleCache.set(
    cacheKey,
    style
  );

  return style;
}

function createClusterStyle(
  feature,
  layerType
) {
  const clusteredFeatures =
    feature.get(
      "features"
    ) ?? [];

  const size =
    clusteredFeatures.length;

  if (size <= 1) {
    return layerType ===
      "poi"
      ? singlePoiStyle
      : singleTrafoStyle;
  }

  const cache =
    layerType ===
    "poi"
      ? poiClusterStyleCache
      : trafoClusterStyleCache;

  if (cache.has(size)) {
    return cache.get(size);
  }

  const isPoi =
    layerType === "poi";

  const radius =
    size > 999
      ? 16
      : size > 499
        ? 15
        : size > 99
          ? 13
          : size > 19
            ? 11
            : 9;

  const style =
    new Style({
      image:
        new CircleStyle({
          radius,

          fill:
            new Fill({
              color:
                isPoi
                  ? "rgba(15, 23, 42, 0.9)"
                  : "rgba(234, 88, 12, 0.92)",
            }),

          stroke:
            new Stroke({
              color:
                "#ffffff",
              width: 2,
            }),
        }),

      text: new Text({
        text:
          String(size),

        fill:
          new Fill({
            color:
              "#ffffff",
          }),

        stroke:
          new Stroke({
            color:
              "rgba(0, 0, 0, 0.82)",

            width: 2,
          }),

        font:
          "bold 11px Arial",
      }),
    });

  cache.set(
    size,
    style
  );

  return style;
}

function createCandidateFeature(
  candidate,
  selectedPointId
) {
  const normalizedCandidate =
    normalizeCandidateForMap(
      candidate
    );

  if (
    !normalizedCandidate
  ) {
    return null;
  }

  const feature =
    new Feature({
      geometry:
        new Point(
          fromLonLat([
            normalizedCandidate.longitude,
            normalizedCandidate.latitude,
          ])
        ),

      candidate:
        normalizedCandidate,

      candidateId:
        normalizedCandidate.id,

      featureType:
        "candidate",
    });

  feature.setStyle(
    createCandidateStyle(
      normalizedCandidate,

      String(
        normalizedCandidate.id
      ) ===
        String(
          selectedPointId
        )
    )
  );

  return feature;
}

function createManualPinFeature(
  candidate
) {
  if (!candidate) {
    return null;
  }

  const latitude =
    Number(
      candidate.latitude
    );

  const longitude =
    Number(
      candidate.longitude
    );

  if (
    !Number.isFinite(
      latitude
    ) ||
    !Number.isFinite(
      longitude
    )
  ) {
    return null;
  }

  const feature =
    new Feature({
      geometry:
        new Point(
          fromLonLat([
            longitude,
            latitude,
          ])
        ),

      candidate,
      candidateId:
        candidate.id,
      featureType:
        "manual-pin",
    });

  feature.setStyle(
    manualPinStyle
  );

  return feature;
}

function parseRegionGeometry(
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
        return JSON.parse(
          value
        );
      } catch {
        continue;
      }
    }
  }

  return null;
}

function createRegionStyle(
  feature,
  resolution
) {
  const regionIndex =
    feature.get(
      "regionIndex"
    ) ?? 0;

  const isSelected =
    feature.get(
      "selected"
    ) === true;

  const regionName =
    feature.get(
      "name"
    ) ?? "";

  const showLabel =
    !isSelected &&
    resolution <=
      CANDIDATE_REGION_LABEL_MAX_RESOLUTION;

  const cacheKey = [
    regionIndex %
      regionColors.length,

    isSelected
      ? "selected"
      : "default",

    showLabel
      ? "label"
      : "no-label",

    regionName,
  ].join("-");

  if (
    candidateRegionStyleCache.has(
      cacheKey
    )
  ) {
    return candidateRegionStyleCache.get(
      cacheKey
    );
  }

  const style =
    new Style({
      fill:
        new Fill({
          color:
            isSelected
              ? "rgba(37, 99, 235, 0.46)"
              : regionColors[
                  regionIndex %
                    regionColors.length
                ],
        }),

      stroke:
        new Stroke({
          color:
            isSelected
              ? "#1d4ed8"
              : "rgba(239, 68, 68, 0.92)",

          width:
            isSelected
              ? 5
              : 3,
        }),

      text:
        showLabel
          ? new Text({
              text:
                regionName,

              overflow:
                false,

              font:
                isSelected
                  ? "bold 13px Arial"
                  : "bold 10px Arial",

              fill:
                new Fill({
                  color:
                    "#0f172a",
                }),

              stroke:
                new Stroke({
                  color:
                    "rgba(255, 255, 255, 0.92)",

                  width:
                    isSelected
                      ? 4
                      : 3,
                }),

              padding: [
                0,
                0,
                0,
                0,
              ],
            })
          : undefined,
    });

  candidateRegionStyleCache.set(
    cacheKey,
    style
  );

  return style;
}

function createRegionFeatures(
  regions
) {
  const parser =
    new GeoJSON();

  return regions.flatMap(
    (
      region,
      index
    ) => {
      const regionGeometry =
        parseRegionGeometry(
          region
        );

      if (
        !regionGeometry
      ) {
        return [];
      }

      try {
        const features =
          parser.readFeatures(
            regionGeometry,
            {
              dataProjection:
                "EPSG:4326",

              featureProjection:
                "EPSG:3857",
            }
          );

        return features.map(
          (feature) => {
            feature.set(
              "featureType",
              "region"
            );

            feature.set(
              "region",
              region
            );

            feature.set(
              "regionId",
              getRegionId(
                region
              )
            );

            feature.set(
              "name",
              getRegionName(
                region
              )
            );

            feature.set(
              "regionIndex",
              index
            );

            feature.set(
              "selected",
              false
            );

            return feature;
          }
        );
      } catch (error) {
        console.error(
          "Bölge geometrisi okunamadı:",
          region,
          error
        );

        return [];
      }
    }
  );
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
    clusteredFeatures.length ===
      0
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

      if (
        !featureExtent
      ) {
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
      String(value).trim() !==
        ""
    ) {
      return String(
        value
      ).trim();
    }
  }

  return "";
}

function createLayerDetail(
  feature,
  layerType
) {
  return {
    layerType,

    typeLabel:
      layerType === "poi"
        ? "POI"
        : "Trafo",

    id:
      getFeatureProperty(
        feature,
        [
          "ID",
          "id",
          "Id",
        ]
      ) || "unknown",

    name:
      getFeatureProperty(
        feature,
        [
          "NAME",
          "name",
          "Name",
        ]
      ) ||
      (
        layerType ===
        "poi"
          ? "İsimsiz POI"
          : "İsimsiz Trafo"
      ),

    subCategory:
      getFeatureProperty(
        feature,
        [
          "SUB_CATEGORY",
          "subCategory",
          "SubCategory",
        ]
      ),

    category:
      getFeatureProperty(
        feature,
        [
          "CATEGORY",
          "category",
          "Category",
        ]
      ),

    phone:
      getFeatureProperty(
        feature,
        [
          "PHONE",
          "phone",
          "Phone",
        ]
      ),

    fax:
      getFeatureProperty(
        feature,
        [
          "FAX",
          "fax",
          "Fax",
        ]
      ),

    email:
      getFeatureProperty(
        feature,
        [
          "EMAIL",
          "email",
          "Email",
        ]
      ),

    web:
      getFeatureProperty(
        feature,
        [
          "WEB",
          "web",
          "Web",
        ]
      ),
  };
}

function createTestIdPart(value) {
  return String(
    value ?? "unknown"
  )
    .trim()
    .replace(
      /[^a-zA-Z0-9_-]/g,
      "-"
    );
}

function createExternalUrl(value) {
  const text =
    String(
      value ?? ""
    ).trim();

  if (!text) {
    return "";
  }

  if (
    /^https?:\/\//i.test(
      text
    )
  ) {
    return text;
  }

  return `https://${text}`;
}

function getPopupPosition(
  map,
  coordinate
) {
  const pixel =
    map.getPixelFromCoordinate(
      coordinate
    );

  const mapSize =
    map.getSize() ?? [
      0,
      0,
    ];

  const popupWidth =
    310;

  const popupHeight =
    340;

  const left =
    Math.max(
      12,

      Math.min(
        pixel[0] + 16,

        mapSize[0] -
          popupWidth -
          12
      )
    );

  const top =
    Math.max(
      78,

      Math.min(
        pixel[1] - 24,

        mapSize[1] -
          popupHeight -
          12
      )
    );

  return {
    left,
    top,
  };
}

function setSelectedRegionFeature(
  regionSource,
  regionId
) {
  regionSource
    .getFeatures()
    .forEach(
      (feature) => {
        const isSelected =
          regionId !==
            null &&
          regionId !==
            undefined &&
          String(
            feature.get(
              "regionId"
            )
          ) ===
            String(
              regionId
            );

        feature.set(
          "selected",
          isSelected
        );

        feature.changed();
      }
    );
}

function fitMapToRegion(
  map,
  regionFeature
) {
  const extent =
    regionFeature
      ?.getGeometry()
      ?.getExtent();

  if (
    !extent ||
    !Number.isFinite(
      extent[0]
    )
  ) {
    return;
  }

  map.getView().fit(
    extent,
    {
      padding: [
        110,
        390,
        110,
        260,
      ],

      maxZoom: 15,
      duration: 450,
    }
  );
}

function fitMapToAllRegions(
  map,
  regionSource
) {
  const extent =
    regionSource.getExtent();

  if (
    !extent ||
    !Number.isFinite(
      extent[0]
    )
  ) {
    map.getView().animate({
      center:
        CANKAYA_CENTER,

      zoom: 12.2,
      duration: 350,
    });

    return;
  }

  map.getView().fit(
    extent,
    {
      padding: [
        100,
        350,
        90,
        100,
      ],

      maxZoom: 12.5,
      duration: 450,
    }
  );
}

function getLayerButtonText(
  label,
  status,
  active
) {
  if (
    status ===
    "loading"
  ) {
    return `${label} yükleniyor`;
  }

  if (
    status ===
    "error"
  ) {
    return `${label} bulunamadı`;
  }

  return active
    ? `${label} açık`
    : `${label} kapalı`;
}

function showDetailValue(value) {
  return value ||
    "Veri yok";
}

export default function CandidatePointsMap({
  points = [],
  regions = [],
  regionsActive = false,
  selectedPointId = null,
  candidateFocusKey = 0,
  focusedRegionId = null,
  regionFocusKey = 0,
  manualPinCandidate = null,
  manualPinStatus = "idle",
  manualPinMessage = "",
  manualPinError = "",
  onManualPinRequest,
  onPointSelect,
  onRegionSelect,
}) {
  const mapElementRef =
    useRef(null);

  const mapRef =
    useRef(null);

  const selectedRegionRef =
    useRef(null);

  const candidateSourceRef =
    useRef(
      new VectorSource()
    );

  const candidateClusterSourceRef =
    useRef(
      new Cluster({
        distance: 58,
        minDistance: 28,

        source:
          candidateSourceRef.current,
      })
    );

  const selectedPointIdRef =
    useRef(
      selectedPointId
    );

  const candidateLayerRef =
    useRef(null);

  const regionSourceRef =
    useRef(
      new VectorSource()
    );

  const manualPinSourceRef =
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
        distance: 72,
        minDistance: 32,

        source:
          poiSourceRef.current,
      })
    );

  const trafoClusterSourceRef =
    useRef(
      new Cluster({
        distance: 78,
        minDistance: 34,

        source:
          trafoSourceRef.current,
      })
    );

  const regionLayerRef =
    useRef(null);

  const poiLayerRef =
    useRef(null);

  const trafoLayerRef =
    useRef(null);

  const roadLayerRef =
    useRef(null);

  const regionSelectRef =
    useRef(null);

  const callbackRef =
    useRef({
      onManualPinRequest,
      onPointSelect,
      onRegionSelect,
    });

  const interactionRef =
    useRef({
      manualPinMode:
        false,

      manualPinLoading:
        false,
    });

  const layerDetailCoordinateRef =
    useRef(null);

  const [
    internalRegions,
    setInternalRegions,
  ] = useState([]);

  const [
    regionLoadError,
    setRegionLoadError,
  ] = useState("");

  const [
    selectedRegion,
    setSelectedRegion,
  ] = useState(null);

  const [
    manualPinMode,
    setManualPinMode,
  ] = useState(false);

  const [
    manualPinHint,
    setManualPinHint,
  ] = useState("");

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

  const [
    layerDetail,
    setLayerDetail,
  ] = useState(null);

  const [
    layerDetailPosition,
    setLayerDetailPosition,
  ] = useState(null);

  const resolvedRegions =
    useMemo(() => {
      if (
        Array.isArray(
          regions
        ) &&
        regions.length >
          0
      ) {
        return regions;
      }

      return internalRegions;
    }, [
      regions,
      internalRegions,
    ]);

  const selectedRegionId =
    getRegionId(
      selectedRegion
    );

  const selectedRegionName =
    selectedRegion
      ? getRegionName(
          selectedRegion
        )
      : "";

  const safePoints =
    useMemo(() => {
      if (
        !Array.isArray(
          points
        )
      ) {
        return [];
      }

      return points
        .filter(
          (candidate) =>
            !candidate?.isManual
        )
        .map(
          normalizeCandidateForMap
        )
        .filter(Boolean);
    }, [points]);

  const layerDetailTestIdBase =
    layerDetail
      ? `candidate-${layerDetail.layerType}-detail-${createTestIdPart(
          layerDetail.id
        )}`
      : "";

  const manualPinLoading =
    manualPinStatus ===
    "loading";

  const displayedManualPinMessage =
    manualPinError ||
    manualPinMessage ||
    manualPinHint;

  function closeLayerDetail() {
    layerDetailCoordinateRef.current =
      null;

    setLayerDetail(
      null
    );

    setLayerDetailPosition(
      null
    );
  }

  useEffect(() => {
    callbackRef.current = {
      onManualPinRequest,
      onPointSelect,
      onRegionSelect,
    };
  }, [
    onManualPinRequest,
    onPointSelect,
    onRegionSelect,
  ]);

  useEffect(() => {
    selectedRegionRef.current =
      selectedRegion;
  }, [selectedRegion]);

  useEffect(() => {
    interactionRef.current = {
      manualPinMode,
      manualPinLoading,
    };

    if (
      mapElementRef.current
    ) {
      mapElementRef.current.style.cursor =
        manualPinMode
          ? "crosshair"
          : "default";
    }
  }, [
    manualPinMode,
    manualPinLoading,
  ]);

  useEffect(() => {
    if (
      Array.isArray(
        regions
      ) &&
      regions.length >
        0
    ) {
      setRegionLoadError(
        ""
      );

      return;
    }

    let isMounted =
      true;

    async function loadRegions() {
      try {
        const result =
          await getRegions();

        if (!isMounted) {
          return;
        }

        const safeRegions =
          extractRegionList(
            result
          );

        setInternalRegions(
          safeRegions
        );

        if (
          safeRegions.length ===
          0
        ) {
          setRegionLoadError(
            "Bölge geometrileri API cevabında bulunamadı."
          );
        } else {
          setRegionLoadError(
            ""
          );
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error(
          "Bölge verileri alınamadı:",
          error
        );

        setInternalRegions(
          []
        );

        setRegionLoadError(
          "Bölge verileri yüklenemedi."
        );
      }
    }

    loadRegions();

    return () => {
      isMounted =
        false;
    };
  }, [regions]);

  useEffect(() => {
    let isMounted =
      true;

    async function loadLayers() {
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
                (
                  currentStatus
                ) => ({
                  ...currentStatus,

                  [key]:
                    "ready",
                })
              );
            } catch (error) {
              console.error(
                `${key} katmanı yüklenemedi:`,
                error
              );

              if (!isMounted) {
                return;
              }

              setLayerStatus(
                (
                  currentStatus
                ) => ({
                  ...currentStatus,

                  [key]:
                    "error",
                })
              );
            }
          }
        )
      );
    }

    loadLayers();

    return () => {
      isMounted =
        false;
    };
  }, []);

  function toggleManualPinMode() {
    if (
      !regionsActive
    ) {
      setManualPinHint(
        "Önce Bölgeler aktif seçeneğini açın."
      );

      return;
    }

    if (
      !selectedRegionId
    ) {
      setManualPinHint(
        "Önce haritadaki renkli bölgelerden birini seçin."
      );

      return;
    }

    if (
      manualPinLoading
    ) {
      return;
    }

    closeLayerDetail();

    setManualPinMode(
      (
        currentValue
      ) => {
        const nextValue =
          !currentValue;

        setManualPinHint(
          nextValue
            ? `${selectedRegionName} içinde manuel pin bırakmak için haritaya tıklayın.`
            : "Manuel pin modu kapatıldı."
        );

        return nextValue;
      }
    );
  }

  function togglePoiLayer() {
    setPoiVisible(
      (
        currentValue
      ) => {
        const nextValue =
          !currentValue;

        if (nextValue) {
          setTrafoVisible(
            false
          );

          if (
            layerDetail?.layerType ===
            "trafo"
          ) {
            closeLayerDetail();
          }
        } else if (
          layerDetail?.layerType ===
          "poi"
        ) {
          closeLayerDetail();
        }

        return nextValue;
      }
    );
  }

  function toggleTrafoLayer() {
    setTrafoVisible(
      (
        currentValue
      ) => {
        const nextValue =
          !currentValue;

        if (nextValue) {
          setPoiVisible(
            false
          );

          if (
            layerDetail?.layerType ===
            "poi"
          ) {
            closeLayerDetail();
          }
        } else if (
          layerDetail?.layerType ===
          "trafo"
        ) {
          closeLayerDetail();
        }

        return nextValue;
      }
    );
  }

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
        zIndex: 3,
      });

    const roadLayer =
      new VectorLayer({
        source:
          roadSourceRef.current,

        style:
          roadStyle,

        visible:
          false,

        zIndex: 4,
      });

    const poiLayer =
      new VectorLayer({
        source:
          poiClusterSourceRef.current,

        style:
          (feature) =>
            createClusterStyle(
              feature,
              "poi"
            ),

        visible:
          false,

        renderBuffer:
          100,

        updateWhileAnimating:
          false,

        updateWhileInteracting:
          false,

        zIndex: 5,
      });

    const trafoLayer =
      new VectorLayer({
        source:
          trafoClusterSourceRef.current,

        style:
          (feature) =>
            createClusterStyle(
              feature,
              "trafo"
            ),

        visible:
          false,

        renderBuffer:
          100,

        updateWhileAnimating:
          false,

        updateWhileInteracting:
          false,

        zIndex: 5,
      });

    const candidateLayer =
      new VectorLayer({
        source:
          candidateClusterSourceRef.current,

        style:
          (feature) =>
            createCandidateClusterStyle(
              feature,

              selectedPointIdRef.current
            ),

        renderBuffer:
          120,

        updateWhileAnimating:
          false,

        updateWhileInteracting:
          false,

        zIndex: 7,
      });

    const manualPinLayer =
      new VectorLayer({
        source:
          manualPinSourceRef.current,

        zIndex: 8,
      });

    const map =
      new OlMap({
        target:
          mapElementRef.current,

        layers: [
          new TileLayer({
            source:
              new OSM({
                wrapX:
                  false,

                crossOrigin:
                  "anonymous",
              }),

            zIndex: 0,
          }),

          regionLayer,
          roadLayer,
          poiLayer,
          trafoLayer,
          candidateLayer,
          manualPinLayer,
        ],

        view:
          new View({
            center:
              CANKAYA_CENTER,

            zoom: 12.2,
            minZoom: 9.5,
            maxZoom: 19,
          }),

        controls: [],
      });

    const updateDetailPosition =
      () => {
        const coordinate =
          layerDetailCoordinateRef.current;

        if (
          !coordinate
        ) {
          return;
        }

        setLayerDetailPosition(
          getPopupPosition(
            map,
            coordinate
          )
        );
      };

    map.on(
      "moveend",
      updateDetailPosition
    );

    const regionSelectInteraction =
      new Select({
        layers: [
          regionLayer,
        ],

        style: null,
        hitTolerance: 12,

        filter:
          (feature) =>
            feature.get(
              "featureType"
            ) ===
            "region",

        condition:
          (event) => {
            if (
              interactionRef.current
                .manualPinMode ||
              interactionRef.current
                .manualPinLoading
            ) {
              return false;
            }

            const upperLayerHit =
              event.map.hasFeatureAtPixel(
                event.pixel,
                {
                  hitTolerance:
                    8,

                  layerFilter:
                    (layer) =>
                      layer ===
                        candidateLayer ||
                      layer ===
                        manualPinLayer ||
                      layer ===
                        poiLayer ||
                      layer ===
                        trafoLayer,
                }
              );

            return (
              !upperLayerHit &&
              click(event)
            );
          },
      });

    regionSelectInteraction.on(
      "select",
      (event) => {
        const regionFeature =
          event.selected?.[0];

        if (
          !regionFeature
        ) {
          return;
        }

        closeLayerDetail();

        const region =
          regionFeature.get(
            "region"
          );

        const clickedRegionId =
          regionFeature.get(
            "regionId"
          );

        setSelectedRegion(
          region
        );

        setManualPinMode(
          false
        );

        setManualPinHint(
          `${getRegionName(
            region
          )} bölgesi seçildi. Manuel pin ekleyebilirsiniz.`
        );

        setSelectedRegionFeature(
          regionSourceRef.current,
          clickedRegionId
        );

        fitMapToRegion(
          map,
          regionFeature
        );

        callbackRef.current
          .onRegionSelect?.(
            region
          );

        regionSelectInteraction
          .getFeatures()
          .clear();
      }
    );

    map.addInteraction(
      regionSelectInteraction
    );

    map.on(
      "singleclick",
      (event) => {
        if (
          interactionRef.current
            .manualPinMode &&
          !interactionRef.current
            .manualPinLoading
        ) {
          const [
            longitude,
            latitude,
          ] =
            toLonLat(
              event.coordinate
            );

          const currentRegion =
            selectedRegionRef.current;

          const currentRegionId =
            getRegionId(
              currentRegion
            );

          if (
            !currentRegionId
          ) {
            setManualPinHint(
              "Önce haritadaki renkli bölgelerden birini seçmelisiniz."
            );

            return;
          }

          setManualPinHint(
            ""
          );

          closeLayerDetail();

          callbackRef.current
            .onManualPinRequest?.({
              region:
                currentRegion,

              regionId:
                currentRegionId,

              latitude,
              longitude,
            });

          return;
        }

        const candidateMapHit =
          map.forEachFeatureAtPixel(
            event.pixel,

            (
              feature,
              layer
            ) => {
              if (
                layer ===
                  manualPinLayer &&
                feature.get(
                  "featureType"
                ) ===
                  "manual-pin"
              ) {
                return {
                  type:
                    "manual-pin",

                  feature,
                };
              }

              if (
                layer ===
                candidateLayer
              ) {
                return {
                  type:
                    "candidate-cluster",

                  feature,
                };
              }

              return undefined;
            },

            {
              hitTolerance:
                10,
            }
          );

        if (
          candidateMapHit
        ) {
          closeLayerDetail();

          if (
            candidateMapHit.type ===
            "manual-pin"
          ) {
            const candidate =
              candidateMapHit.feature.get(
                "candidate"
              );

            callbackRef.current
              .onPointSelect?.(
                candidate
              );

            return;
          }

          const clusteredFeatures =
            candidateMapHit.feature.get(
              "features"
            ) ?? [];

          if (
            clusteredFeatures.length ===
            1
          ) {
            const candidate =
              clusteredFeatures[0].get(
                "candidate"
              );

            callbackRef.current
              .onPointSelect?.(
                candidate
              );

            return;
          }

          if (
            clusteredFeatures.length >
            1
          ) {
            const currentZoom =
              map
                .getView()
                .getZoom() ??
              0;

            if (
              currentZoom >=
              17.5
            ) {
              const nearestFeature =
                clusteredFeatures.reduce(
                  (
                    nearest,
                    currentFeature
                  ) => {
                    const currentCoordinate =
                      currentFeature
                        .getGeometry()
                        ?.getCoordinates();

                    const nearestCoordinate =
                      nearest
                        .getGeometry()
                        ?.getCoordinates();

                    if (
                      !currentCoordinate ||
                      !nearestCoordinate
                    ) {
                      return nearest;
                    }

                    const currentDistance =
                      Math.pow(
                        currentCoordinate[0] -
                          event.coordinate[0],
                        2
                      ) +
                      Math.pow(
                        currentCoordinate[1] -
                          event.coordinate[1],
                        2
                      );

                    const nearestDistance =
                      Math.pow(
                        nearestCoordinate[0] -
                          event.coordinate[0],
                        2
                      ) +
                      Math.pow(
                        nearestCoordinate[1] -
                          event.coordinate[1],
                        2
                      );

                    return currentDistance <
                      nearestDistance
                      ? currentFeature
                      : nearest;
                  },

                  clusteredFeatures[0]
                );

              const candidate =
                nearestFeature.get(
                  "candidate"
                );

              callbackRef.current
                .onPointSelect?.(
                  candidate
                );

              return;
            }

            const clusterExtent =
              getClusterExtent(
                clusteredFeatures
              );

            if (
              clusterExtent
            ) {
              map
                .getView()
                .fit(
                  clusterExtent,
                  {
                    padding: [
                      100,
                      100,
                      100,
                      100,
                    ],

                    maxZoom:
                      18,

                    duration:
                      350,
                  }
                );
            }

            return;
          }
        }

        const activeDataLayer =
          poiLayer.getVisible()
            ? poiLayer
            : trafoLayer.getVisible()
              ? trafoLayer
              : null;

        if (
          !activeDataLayer
        ) {
          closeLayerDetail();

          return;
        }

        const clusterFeature =
          map.forEachFeatureAtPixel(
            event.pixel,

            (feature) =>
              feature,

            {
              hitTolerance:
                16,

              layerFilter:
                (layer) =>
                  layer ===
                  activeDataLayer,
            }
          );

        if (
          !clusterFeature
        ) {
          closeLayerDetail();

          return;
        }

        const clusteredFeatures =
          clusterFeature.get(
            "features"
          );

        if (
          !Array.isArray(
            clusteredFeatures
          ) ||
          clusteredFeatures.length ===
            0
        ) {
          closeLayerDetail();

          return;
        }

        const layerType =
          activeDataLayer ===
          poiLayer
            ? "poi"
            : "trafo";

        if (
          clusteredFeatures.length ===
          1
        ) {
          const sourceFeature =
            clusteredFeatures[0];

          const geometry =
            sourceFeature.getGeometry();

          if (!geometry) {
            closeLayerDetail();

            return;
          }

          const coordinate =
            getCenter(
              geometry.getExtent()
            );

          layerDetailCoordinateRef.current =
            coordinate;

          setLayerDetail(
            createLayerDetail(
              sourceFeature,
              layerType
            )
          );

          setLayerDetailPosition(
            getPopupPosition(
              map,
              coordinate
            )
          );

          return;
        }

        const currentZoom =
          map
            .getView()
            .getZoom() ??
          0;

        if (
          currentZoom >=
          17
        ) {
          const nearestFeature =
            clusteredFeatures.reduce(
              (
                nearest,
                currentFeature
              ) => {
                const currentCoordinate =
                  currentFeature
                    .getGeometry()
                    ?.getCoordinates();

                const nearestCoordinate =
                  nearest
                    .getGeometry()
                    ?.getCoordinates();

                if (
                  !currentCoordinate ||
                  !nearestCoordinate
                ) {
                  return nearest;
                }

                const currentDistance =
                  Math.pow(
                    currentCoordinate[0] -
                      event.coordinate[0],
                    2
                  ) +
                  Math.pow(
                    currentCoordinate[1] -
                      event.coordinate[1],
                    2
                  );

                const nearestDistance =
                  Math.pow(
                    nearestCoordinate[0] -
                      event.coordinate[0],
                    2
                  ) +
                  Math.pow(
                    nearestCoordinate[1] -
                      event.coordinate[1],
                    2
                  );

                return currentDistance <
                  nearestDistance
                  ? currentFeature
                  : nearest;
              },

              clusteredFeatures[0]
            );

          const nearestGeometry =
            nearestFeature.getGeometry();

          if (
            !nearestGeometry
          ) {
            closeLayerDetail();

            return;
          }

          const coordinate =
            getCenter(
              nearestGeometry.getExtent()
            );

          layerDetailCoordinateRef.current =
            coordinate;

          setLayerDetail(
            createLayerDetail(
              nearestFeature,
              layerType
            )
          );

          setLayerDetailPosition(
            getPopupPosition(
              map,
              coordinate
            )
          );

          return;
        }

        closeLayerDetail();

        const clusterExtent =
          getClusterExtent(
            clusteredFeatures
          );

        if (
          clusterExtent
        ) {
          map
            .getView()
            .fit(
              clusterExtent,
              {
                padding: [
                  90,
                  90,
                  90,
                  90,
                ],

                maxZoom:
                  18,

                duration:
                  350,
              }
            );
        }
      }
    );

    map.on(
      "pointermove",
      (event) => {
        if (
          interactionRef.current
            .manualPinMode
        ) {
          map
            .getTargetElement()
            .style.cursor =
            "crosshair";

          return;
        }

        const hasClickableFeature =
          map.hasFeatureAtPixel(
            event.pixel,
            {
              hitTolerance:
                10,

              layerFilter:
                (layer) =>
                  layer ===
                    regionLayer ||
                  layer ===
                    candidateLayer ||
                  layer ===
                    manualPinLayer ||
                  layer ===
                    poiLayer ||
                  layer ===
                    trafoLayer,
            }
          );

        map
          .getTargetElement()
          .style.cursor =
          hasClickableFeature
            ? "pointer"
            : "default";
      }
    );

    mapRef.current =
      map;

    candidateLayerRef.current =
      candidateLayer;

    regionLayerRef.current =
      regionLayer;

    roadLayerRef.current =
      roadLayer;

    poiLayerRef.current =
      poiLayer;

    trafoLayerRef.current =
      trafoLayer;

    regionSelectRef.current =
      regionSelectInteraction;

    const resizeObserver =
      new ResizeObserver(
        () => {
          map.updateSize();

          updateDetailPosition();
        }
      );

    resizeObserver.observe(
      mapElementRef.current
    );

    return () => {
      resizeObserver.disconnect();

      map.un(
        "moveend",
        updateDetailPosition
      );

      map.removeInteraction(
        regionSelectInteraction
      );

      map.setTarget(
        undefined
      );

      mapRef.current =
        null;

      candidateLayerRef.current =
        null;

      regionLayerRef.current =
        null;

      roadLayerRef.current =
        null;

      poiLayerRef.current =
        null;

      trafoLayerRef.current =
        null;

      regionSelectRef.current =
        null;
    };
  }, []);

  useEffect(() => {
    selectedPointIdRef.current =
      selectedPointId;

    candidateLayerRef.current?.changed();
  }, [selectedPointId]);

  useEffect(() => {
    const candidateFeatures =
      safePoints
        .map(
          (candidate) =>
            createCandidateFeature(
              candidate,
              selectedPointId
            )
        )
        .filter(Boolean);

    candidateSourceRef.current.clear();

    candidateSourceRef.current.addFeatures(
      candidateFeatures
    );
  }, [
    safePoints,
    selectedPointId,
  ]);

  useEffect(() => {
    const manualFeature =
      createManualPinFeature(
        manualPinCandidate
      );

    manualPinSourceRef.current.clear();

    if (
      manualFeature
    ) {
      manualPinSourceRef.current.addFeature(
        manualFeature
      );
    }
  }, [manualPinCandidate]);

  useEffect(() => {
    if (
      manualPinStatus ===
        "success" &&
      manualPinCandidate
    ) {
      setManualPinMode(
        false
      );

      setManualPinHint(
        ""
      );
    }
  }, [
    manualPinStatus,
    manualPinCandidate,
  ]);

  useEffect(() => {
    const regionFeatures =
      createRegionFeatures(
        resolvedRegions
      );

    regionSourceRef.current.clear();

    regionSourceRef.current.addFeatures(
      regionFeatures
    );

    if (
      regionFeatures.length ===
        0 &&
      resolvedRegions.length >
        0
    ) {
      setRegionLoadError(
        "Bölge listesi geldi fakat polygon geometrisi bulunamadı."
      );
    } else if (
      regionFeatures.length >
      0
    ) {
      setRegionLoadError(
        ""
      );
    }
  }, [resolvedRegions]);

  useEffect(() => {
    poiLayerRef.current?.setVisible(
      poiVisible
    );
  }, [poiVisible]);

  useEffect(() => {
    trafoLayerRef.current?.setVisible(
      trafoVisible
    );
  }, [trafoVisible]);

  useEffect(() => {
    roadLayerRef.current?.setVisible(
      roadVisible
    );
  }, [roadVisible]);

  useEffect(() => {
    regionLayerRef.current?.setVisible(
      Boolean(
        regionsActive
      )
    );

    regionSelectRef.current?.setActive(
      Boolean(
        regionsActive
      )
    );

    if (
      !mapRef.current
    ) {
      return;
    }

    if (
      !regionsActive
    ) {
      setSelectedRegion(
        null
      );

      setManualPinMode(
        false
      );

      setManualPinHint(
        ""
      );

      setSelectedRegionFeature(
        regionSourceRef.current,
        null
      );

      if (
        selectedPointIdRef.current ===
          null ||
        selectedPointIdRef.current ===
          undefined ||
        selectedPointIdRef.current ===
          ""
      ) {
        mapRef.current
          .getView()
          .animate({
            center:
              CANKAYA_CENTER,

            zoom:
              12.2,

            duration:
              350,
          });
      }

      return;
    }

    fitMapToAllRegions(
      mapRef.current,

      regionSourceRef.current
    );
  }, [
    regionsActive,
    resolvedRegions,
  ]);

  useEffect(() => {
    if (
      !mapRef.current ||
      !regionsActive
    ) {
      return;
    }

    if (
      focusedRegionId ===
        null ||
      focusedRegionId ===
        undefined ||
      focusedRegionId ===
        ""
    ) {
      setSelectedRegion(
        null
      );

      setManualPinMode(
        false
      );

      setManualPinHint(
        ""
      );

      setSelectedRegionFeature(
        regionSourceRef.current,
        null
      );

      fitMapToAllRegions(
        mapRef.current,

        regionSourceRef.current
      );

      return;
    }

    const regionFeature =
      regionSourceRef.current
        .getFeatures()
        .find(
          (feature) =>
            String(
              feature.get(
                "regionId"
              )
            ) ===
            String(
              focusedRegionId
            )
        );

    if (
      !regionFeature
    ) {
      return;
    }

    closeLayerDetail();

    const region =
      regionFeature.get(
        "region"
      );

    setSelectedRegion(
      region
    );

    setManualPinMode(
      false
    );

    setManualPinHint(
      ""
    );

    setSelectedRegionFeature(
      regionSourceRef.current,

      focusedRegionId
    );

    fitMapToRegion(
      mapRef.current,
      regionFeature
    );

    regionSelectRef.current
      ?.getFeatures()
      .clear();

    callbackRef.current
      .onRegionSelect?.(
        region
      );
  }, [
    focusedRegionId,
    regionFocusKey,
    regionsActive,
    resolvedRegions,
  ]);

  useEffect(() => {
    setSelectedRegionFeature(
      regionSourceRef.current,

      selectedRegionId
    );
  }, [
    selectedRegionId,
    resolvedRegions,
  ]);

  useEffect(() => {
    if (
      !mapRef.current ||
      safePoints.length ===
        0 ||
      selectedPointId !==
        null ||
      regionsActive
    ) {
      return;
    }

    const extent =
      candidateSourceRef.current
        .getExtent();

    if (
      !extent ||
      !Number.isFinite(
        extent[0]
      )
    ) {
      return;
    }

    mapRef.current
      .getView()
      .fit(
        extent,
        {
          padding: [
            100,
            360,
            100,
            100,
          ],

          maxZoom:
            14.5,

          duration:
            450,
        }
      );
  }, [
    safePoints,
    selectedPointId,
    regionsActive,
  ]);

  useEffect(() => {
    if (
      !mapRef.current ||
      selectedPointId ===
        null ||
      selectedPointId ===
        undefined
    ) {
      return;
    }

    const selectedCandidate =
      safePoints.find(
        (candidate) =>
          String(
            candidate.id
          ) ===
          String(
            selectedPointId
          )
      );

    if (
      !selectedCandidate
    ) {
      return;
    }

    closeLayerDetail();

    mapRef.current
      .getView()
      .animate({
        center:
          fromLonLat([
            selectedCandidate.longitude,
            selectedCandidate.latitude,
          ]),

        zoom: 16,
        duration: 450,
      });
  }, [
    selectedPointId,
    candidateFocusKey,
    safePoints,
  ]);

  useEffect(() => {
    if (
      !mapRef.current ||
      !manualPinCandidate
    ) {
      return;
    }

    closeLayerDetail();

    mapRef.current
      .getView()
      .animate({
        center:
          fromLonLat([
            Number(
              manualPinCandidate.longitude
            ),

            Number(
              manualPinCandidate.latitude
            ),
          ]),

        zoom: 16,
        duration: 450,
      });
  }, [manualPinCandidate]);

  const totalPointCount =
    safePoints.length +
    (
      manualPinCandidate
        ? 1
        : 0
    );

  return (
    <div
      className={
        manualPinMode
          ? "candidate-points-map manual-pin-active"
          : "candidate-points-map"
      }
      data-testid="candidate-points-openlayers-map"
    >
      <div
        ref={
          mapElementRef
        }
        className="candidate-points-map-canvas"
        data-testid="candidate-points-map-canvas"
      />

      <div
        className="candidate-map-count"
        data-testid="candidate-map-count"
      >
        {totalPointCount} aday nokta
      </div>

      <div
        className="candidate-left-controls"
        data-testid="candidate-left-controls"
      >
        <div
          className="candidate-manual-controls"
          data-testid="candidate-manual-controls"
        >
          <div className="candidate-selected-region">
            <strong>
              Seçili Bölge
            </strong>

            <span
              data-testid="candidate-selected-region-name"
            >
              {selectedRegionName ||
                "Bölge seçilmedi"}
            </span>
          </div>

          <button
            type="button"
            className={
              manualPinMode
                ? "manual-pin-button active"
                : "manual-pin-button"
            }
            disabled={
              !regionsActive ||
              !selectedRegionId ||
              manualPinLoading
            }
            onClick={
              toggleManualPinMode
            }
            data-testid="manual-pin-mode-button"
          >
            {manualPinLoading
              ? "Değerlendiriliyor..."
              : manualPinMode
                ? "Manuel Pin Modunu Kapat"
                : "Manuel Pin Ekle"}
          </button>
        </div>

        <div
          className="candidate-layer-controls"
          data-testid="candidate-layer-controls"
        >
          <strong>
            Harita Katmanları
          </strong>

          <small
            className="candidate-layer-note"
            data-testid="candidate-layer-note"
          >
            POI ve Trafo aynı anda gösterilmez.
          </small>

          <button
            type="button"
            className={
              poiVisible
                ? "candidate-layer-button active"
                : "candidate-layer-button"
            }
            disabled={
              layerStatus.poi !==
              "ready"
            }
            onClick={
              togglePoiLayer
            }
            data-testid="candidate-poi-layer-toggle"
          >
            <span className="candidate-layer-symbol candidate-poi-symbol" />

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
                ? "candidate-layer-button active"
                : "candidate-layer-button"
            }
            disabled={
              layerStatus.trafo !==
              "ready"
            }
            onClick={
              toggleTrafoLayer
            }
            data-testid="candidate-trafo-layer-toggle"
          >
            <span className="candidate-layer-symbol candidate-trafo-symbol" />

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
                ? "candidate-layer-button active"
                : "candidate-layer-button"
            }
            disabled={
              layerStatus.road !==
              "ready"
            }
            onClick={() =>
              setRoadVisible(
                (
                  currentValue
                ) =>
                  !currentValue
              )
            }
            data-testid="candidate-road-layer-toggle"
          >
            <span className="candidate-layer-symbol candidate-road-symbol" />

            {getLayerButtonText(
              "Yol",
              layerStatus.road,
              roadVisible
            )}
          </button>
        </div>
      </div>

      {layerDetail &&
        layerDetailPosition && (
          <aside
            className="candidate-layer-detail-popup"
            style={{
              left:
                `${layerDetailPosition.left}px`,

              top:
                `${layerDetailPosition.top}px`,
            }}
            data-layer-type={
              layerDetail.layerType
            }
            data-layer-id={
              layerDetail.id
            }
            data-testid={`${layerDetailTestIdBase}-popup`}
          >
            <button
              type="button"
              className="candidate-layer-detail-close"
              onClick={
                closeLayerDetail
              }
              aria-label="Detay penceresini kapat"
              data-testid={`${layerDetailTestIdBase}-close-button`}
            >
              ×
            </button>

            <div className="candidate-layer-detail-header">
              <span
                className={
                  layerDetail.layerType ===
                  "poi"
                    ? "candidate-layer-detail-type poi"
                    : "candidate-layer-detail-type trafo"
                }
                data-testid={`${layerDetailTestIdBase}-type`}
              >
                {
                  layerDetail.typeLabel
                }
              </span>

              <h3
                data-testid={`${layerDetailTestIdBase}-name`}
              >
                {
                  layerDetail.name
                }
              </h3>
            </div>

            <dl className="candidate-layer-detail-list">
              <div>
                <dt>
                  Kategori
                </dt>

                <dd
                  data-testid={`${layerDetailTestIdBase}-category`}
                >
                  {showDetailValue(
                    layerDetail.category
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  Alt Kategori
                </dt>

                <dd
                  data-testid={`${layerDetailTestIdBase}-subcategory`}
                >
                  {showDetailValue(
                    layerDetail.subCategory
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  Kayıt ID
                </dt>

                <dd
                  data-testid={`${layerDetailTestIdBase}-id`}
                >
                  {
                    layerDetail.id
                  }
                </dd>
              </div>

              <div>
                <dt>
                  Telefon
                </dt>

                <dd
                  data-testid={`${layerDetailTestIdBase}-phone`}
                >
                  {showDetailValue(
                    layerDetail.phone
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  Faks
                </dt>

                <dd
                  data-testid={`${layerDetailTestIdBase}-fax`}
                >
                  {showDetailValue(
                    layerDetail.fax
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  E-posta
                </dt>

                <dd
                  data-testid={`${layerDetailTestIdBase}-email`}
                >
                  {layerDetail.email
                    ? (
                      <a
                        href={`mailto:${layerDetail.email}`}
                      >
                        {
                          layerDetail.email
                        }
                      </a>
                    )
                    : "Veri yok"}
                </dd>
              </div>

              <div>
                <dt>
                  Web
                </dt>

                <dd
                  data-testid={`${layerDetailTestIdBase}-web`}
                >
                  {layerDetail.web
                    ? (
                      <a
                        href={
                          createExternalUrl(
                            layerDetail.web
                          )
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        {
                          layerDetail.web
                        }
                      </a>
                    )
                    : "Veri yok"}
                </dd>
              </div>
            </dl>
          </aside>
        )}

      <div
        className="candidate-map-legend"
        data-testid="candidate-map-legend"
      >
        <span>
          <i className="candidate-score-high" />
          80–100
        </span>

        <span>
          <i className="candidate-score-medium" />
          50–79
        </span>

        <span>
          <i className="candidate-score-low" />
          0–49
        </span>

        <span>
          <i className="candidate-score-manual" />
          Manuel
        </span>
      </div>

      {regionLoadError &&
        regionsActive && (
          <div
            className="candidate-region-error"
            data-testid="candidate-region-error"
          >
            {
              regionLoadError
            }
          </div>
        )}

      {displayedManualPinMessage && (
        <div
          className="manual-pin-message"
          data-testid="manual-pin-message"
        >
          {
            displayedManualPinMessage
          }
        </div>
      )}
    </div>
  );
}