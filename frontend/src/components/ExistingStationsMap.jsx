import { useEffect, useMemo, useRef, useState } from "react";
import Feature from "ol/Feature";
import OlMap from "ol/Map";
import View from "ol/View";
import GeoJSON from "ol/format/GeoJSON";
import Point from "ol/geom/Point";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import "ol/ol.css";
import { getCenter } from "ol/extent";
import { fromLonLat } from "ol/proj";
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

import { mockChargingStations } from "../data/mockChargingStations";

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

/*
 * Bölge isimleri bu çözünürlük değerinin altında görünür.
 * Yaklaşık olarak zoom 13 ve üzerindeki seviyelere karşılık gelir.
 */
const REGION_LABEL_MAX_RESOLUTION = 24;

const PLACE_SEARCH_PRESETS = [
  {
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
    aliases: [
      "kizilay",
      "kızılay",
    ],
    longitude: 32.8541,
    latitude: 39.9208,
    zoom: 16,
  },
  {
    aliases: [
      "ulus",
    ],
    longitude: 32.8548,
    latitude: 39.9415,
    zoom: 16,
  },
  {
    aliases: [
      "bahcelievler",
      "bahçelievler",
    ],
    longitude: 32.8237,
    latitude: 39.9231,
    zoom: 15.5,
  },
  {
    aliases: [
      "dikmen",
    ],
    longitude: 32.8403,
    latitude: 39.8873,
    zoom: 15.5,
  },
  {
    aliases: [
      "cebeci",
    ],
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

const regionStyleCache = new Map();
const poiClusterStyleCache = new Map();
const trafoClusterStyleCache = new Map();

const singlePoiStyle = new Style({
  image: new CircleStyle({
    radius: 3.5,

    fill: new Fill({
      color: "rgba(15, 23, 42, 0.92)",
    }),

    stroke: new Stroke({
      color: "#ffffff",
      width: 1,
    }),
  }),
});

const singleTrafoStyle = new Style({
  image: new CircleStyle({
    radius: 4,

    fill: new Fill({
      color: "rgba(234, 88, 12, 0.94)",
    }),

    stroke: new Stroke({
      color: "#ffffff",
      width: 1,
    }),
  }),
});

const roadStyle = new Style({
  stroke: new Stroke({
    color: "rgba(37, 99, 235, 0.38)",
    width: 1.2,
  }),
});

function normalizeText(value) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findPreset(searchValue) {
  const normalizedSearch =
    normalizeText(searchValue);

  return PLACE_SEARCH_PRESETS.find(
    (preset) =>
      preset.aliases.some(
        (alias) =>
          normalizeText(alias) ===
          normalizedSearch
      )
  );
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
        color: "rgba(0, 0, 0, 0.8)",
        width: 2,
      }),

      font: "bold 11px Arial",
    }),
  });

  cache.set(size, style);

  return style;
}

function formatConnectors(connectors = []) {
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

function formatPower(connectors = []) {
  if (
    !Array.isArray(connectors) ||
    connectors.length === 0
  ) {
    return null;
  }

  const maxPower = Math.max(
    ...connectors.map(
      (connector) =>
        Number(connector.powerKw) || 0
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
  const status =
    station.status ??
    (station.isActive === false
      ? "Pasif"
      : "Aktif");

  const regionName =
    station.regionName ||
    regionLookup.get(
      station.regionId
    );

  const connectorText =
    formatConnectors(
      station.connectors
    );

  const powerText =
    formatPower(
      station.connectors
    );

  return {
    id: station.id,

    name:
      station.name ||
      "Sarj Istasyonu",

    district:
      station.district ||
      "Cankaya",

    neighborhood:
      station.neighborhood ||
      regionName ||
      "Bolge bilgisi yok",

    address:
      station.address ||
      `${
        station.neighborhood ||
        regionName ||
        "Cankaya"
      }, Ankara`,

    latitude:
      Number(
        station.latitude
      ),

    longitude:
      Number(
        station.longitude
      ),

    socketType:
      station.socketType ||
      station.connectorType ||
      connectorText ||
      "Soket bilgisi yok",

    status,

    power:
      station.power ||
      powerText ||
      station.operatorName ||
      "Guc bilgisi yok",
  };
}

function stationMatchesSearch(
  station,
  searchTerm
) {
  const normalizedSearch =
    normalizeText(searchTerm);

  if (!normalizedSearch) {
    return true;
  }

  const searchableText =
    normalizeText(
      [
        station.name,
        station.district,
        station.neighborhood,
        station.address,
        station.socketType,
      ].join(" ")
    );

  return searchableText.includes(
    normalizedSearch
  );
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
              fill="${isSelected ? "#2563eb" : color}"
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
      geometry:
        new Point(
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

/*
 * Ev haritasında isimler:
 * - Uzak görünümde gizlidir.
 * - Yakınlaşınca görünür.
 * - Seçilen bölgenin adı her zaman görünür.
 */
function createRegionStyle(
  feature,
  resolution
) {
  const index =
    feature.get("regionIndex") ?? 0;

  const isSelected =
    feature.get("selected") === true;

  const regionName =
    feature.get("name") ||
    feature.get("region")?.name ||
    "";

  const showLabel =
    isSelected ||
    resolution <=
      REGION_LABEL_MAX_RESOLUTION;

  const cacheKey = [
    index % regionColors.length,
    isSelected
      ? "selected"
      : "default",
    showLabel
      ? "label"
      : "no-label",
    regionName,
  ].join("-");

  if (
    regionStyleCache.has(cacheKey)
  ) {
    return regionStyleCache.get(
      cacheKey
    );
  }

  const style = new Style({
    fill: new Fill({
      color: isSelected
        ? "rgba(132, 255, 80, 0.52)"
        : regionColors[
            index %
              regionColors.length
          ],
    }),

    stroke: new Stroke({
      color: isSelected
        ? "#dc2626"
        : "rgba(239, 68, 68, 0.85)",

      width: isSelected
        ? 5
        : 3.5,
    }),

    text: showLabel
      ? new Text({
          text: regionName,

          overflow: false,

          font: isSelected
            ? "bold 14px Arial"
            : "bold 10px Arial",

          fill: new Fill({
            color: "#0f172a",
          }),

          /*
           * Beyaz kutu kaldırıldı.
           * Bu stroke yalnızca harflerin çevresinde
           * ince bir okunabilirlik çizgisi oluşturur.
           */
          stroke: new Stroke({
            color:
              "rgba(255, 255, 255, 0.92)",

            width: isSelected
              ? 4
              : 3,
          }),

          padding: [0, 0, 0, 0],
        })
      : undefined,
  });

  regionStyleCache.set(
    cacheKey,
    style
  );

  return style;
}

function createRegionFeatures(regions) {
  const parser =
    new GeoJSON();

  return regions.flatMap(
    (region, index) => {
      if (
        !region.boundaryGeoJson
      ) {
        return [];
      }

      try {
        const geoJson =
          JSON.parse(
            region.boundaryGeoJson
          );

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
              region.id
            );

            feature.set(
              "name",
              region.name
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
          `${region.name} bolge GeoJSON verisi okunamadi:`,
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
      `${url} yuklenemedi. HTTP ${response.status}`
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

function featureContainsText(
  feature,
  searchValue
) {
  const normalizedSearch =
    normalizeText(searchValue);

  const properties =
    feature.getProperties();

  return Object.entries(
    properties
  ).some(([key, value]) => {
    if (
      key === "geometry" ||
      value === null ||
      value === undefined ||
      typeof value === "object"
    ) {
      return false;
    }

    return normalizeText(
      value
    ).includes(
      normalizedSearch
    );
  });
}

function getPoiName(feature) {
  return (
    feature.get("NAME") ||
    feature.get("name") ||
    ""
  );
}

function findBestPoiFeature(
  features,
  searchValue
) {
  const normalizedSearch =
    normalizeText(searchValue);

  const matches =
    features
      .map((feature) => {
        const poiName =
          normalizeText(
            getPoiName(feature)
          );

        let score = 0;

        if (
          poiName ===
          normalizedSearch
        ) {
          score = 1000;
        } else if (
          poiName.startsWith(
            normalizedSearch
          )
        ) {
          score = 750;
        } else if (
          poiName.includes(
            normalizedSearch
          )
        ) {
          score = 500;
        }

        return {
          feature,
          score,
        };
      })
      .filter(
        (item) =>
          item.score > 0
      )
      .sort(
        (first, second) =>
          second.score -
          first.score
      );

  return (
    matches[0]?.feature ||
    null
  );
}

export default function ExistingStationsMap({
  searchTerm = "",
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
    useMemo(() => {
      return stations.filter(
        (station) =>
          stationMatchesSearch(
            station,
            searchTerm
          )
      );
    }, [
      stations,
      searchTerm,
    ]);

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

        visible:
          false,

        declutter:
          true,

        renderBuffer:
          100,

        zIndex: 2,
      });

    const roadLayer =
      new VectorLayer({
        source:
          roadSourceRef.current,

        style:
          roadStyle,

        visible:
          false,

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

        visible:
          false,

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

        visible:
          false,

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

        view:
          new View({
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

            (item) =>
              item,

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

    mapRef.current =
      map;

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

      mapRef.current =
        null;

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

        const regionLookup =
          new Map(
            safeRegions.map(
              (region) => [
                region.id,
                region.name,
              ]
            )
          );

        setRegions(
          safeRegions
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

        setSource(
          "api"
        );
      } catch (error) {
        console.error(
          "Harita API verileri alinamadi:",
          error
        );

        if (!isMounted) {
          return;
        }

        setRegions([]);

        setStations(
          mockChargingStations
        );

        setSource(
          "mock"
        );
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
                  [key]: "ready",
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
                  [key]: "error",
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
    if (
      poiLayerRef.current
    ) {
      poiLayerRef.current.setVisible(
        poiVisible
      );
    }
  }, [poiVisible]);

  useEffect(() => {
    if (
      trafoLayerRef.current
    ) {
      trafoLayerRef.current.setVisible(
        trafoVisible
      );
    }
  }, [trafoVisible]);

  useEffect(() => {
    if (
      roadLayerRef.current
    ) {
      roadLayerRef.current.setVisible(
        roadVisible
      );
    }
  }, [roadVisible]);

  useEffect(() => {
    const regionsActive =
      mapStep > 1;

    if (
      regionLayerRef.current
    ) {
      regionLayerRef.current.setVisible(
        regionsActive
      );
    }

    if (!regionsActive) {
      setSelectedRegion(
        null
      );

      setRegionSummary(
        null
      );

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

    if (
      normalizeText(
        searchTerm
      ).length >= 2
    ) {
      return;
    }

    setSelectedStationId(
      null
    );

    setPopupPixel(
      null
    );

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
    searchTerm,
  ]);

  useEffect(() => {
    const normalizedSearch =
      normalizeText(
        searchTerm
      );

    if (
      normalizedSearch.length <
        2 ||
      !mapRef.current
    ) {
      return;
    }

    const timeoutId =
      window.setTimeout(
        () => {
          const map =
            mapRef.current;

          if (!map) {
            return;
          }

          const view =
            map.getView();

          view.cancelAnimations();

          setSelectedRegion(
            null
          );

          setRegionSummary(
            null
          );

          setSelectedStationId(
            null
          );

          setPopupPixel(
            null
          );

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

          const presetMatch =
            findPreset(
              searchTerm
            );

          if (
            presetMatch
          ) {
            const targetCoordinate =
              fromLonLat([
                presetMatch.longitude,
                presetMatch.latitude,
              ]);

            view.setCenter(
              targetCoordinate
            );

            view.setZoom(
              presetMatch.zoom
            );

            map.renderSync();

            return;
          }

          const stationMatch =
            stations
              .map(
                (station) => {
                  const normalizedName =
                    normalizeText(
                      station.name
                    );

                  const searchableText =
                    normalizeText(
                      [
                        station.name,
                        station.district,
                        station.neighborhood,
                        station.address,
                        station.socketType,
                      ].join(" ")
                    );

                  let score = 0;

                  if (
                    normalizedName ===
                    normalizedSearch
                  ) {
                    score = 1000;
                  } else if (
                    normalizedName.startsWith(
                      normalizedSearch
                    )
                  ) {
                    score = 750;
                  } else if (
                    normalizedName.includes(
                      normalizedSearch
                    )
                  ) {
                    score = 550;
                  } else if (
                    searchableText.includes(
                      normalizedSearch
                    )
                  ) {
                    score = 250;
                  }

                  return {
                    station,
                    score,
                  };
                }
              )
              .filter(
                (item) =>
                  item.score > 0
              )
              .sort(
                (
                  first,
                  second
                ) =>
                  second.score -
                  first.score
              )[0]?.station;

          if (
            stationMatch
          ) {
            setSelectedStationId(
              stationMatch.id
            );

            view.setCenter(
              fromLonLat([
                stationMatch.longitude,
                stationMatch.latitude,
              ])
            );

            view.setZoom(16);

            map.renderSync();

            return;
          }

          const regionMatch =
            regionSourceRef.current
              .getFeatures()
              .find(
                (feature) => {
                  const regionName =
                    normalizeText(
                      feature.get(
                        "name"
                      ) ||
                      feature.get(
                        "region"
                      )?.name
                    );

                  return (
                    regionName ===
                      normalizedSearch ||
                    regionName.startsWith(
                      normalizedSearch
                    ) ||
                    regionName.includes(
                      normalizedSearch
                    )
                  );
                }
              );

          if (
            regionMatch
          ) {
            const extent =
              regionMatch
                .getGeometry()
                ?.getExtent();

            if (extent) {
              view.fit(
                extent,
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

          const poiFeature =
            findBestPoiFeature(
              poiSourceRef.current
                .getFeatures(),

              searchTerm
            );

          if (
            poiFeature
          ) {
            setPoiVisible(
              true
            );

            const geometry =
              poiFeature.getGeometry();

            if (geometry) {
              view.setCenter(
                getCenter(
                  geometry.getExtent()
                )
              );

              view.setZoom(17);

              map.renderSync();
            }

            return;
          }

          const trafoFeature =
            trafoSourceRef.current
              .getFeatures()
              .find(
                (feature) =>
                  featureContainsText(
                    feature,
                    searchTerm
                  )
              );

          if (
            trafoFeature
          ) {
            setTrafoVisible(
              true
            );

            const geometry =
              trafoFeature.getGeometry();

            if (geometry) {
              view.setCenter(
                getCenter(
                  geometry.getExtent()
                )
              );

              view.setZoom(17);

              map.renderSync();
            }

            return;
          }

          const roadFeature =
            roadSourceRef.current
              .getFeatures()
              .find(
                (feature) =>
                  featureContainsText(
                    feature,
                    searchTerm
                  )
              );

          if (
            roadFeature
          ) {
            setRoadVisible(
              true
            );

            const extent =
              roadFeature
                .getGeometry()
                ?.getExtent();

            if (extent) {
              view.fit(
                extent,
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
        },
        350
      );

    return () => {
      window.clearTimeout(
        timeoutId
      );
    };
  }, [
    searchTerm,
    stations,
    layerStatus.poi,
    layerStatus.trafo,
    layerStatus.road,
  ]);

  useEffect(() => {
    if (
      !selectedStation ||
      !mapRef.current
    ) {
      setPopupPixel(
        null
      );

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
            item.id ===
            stationId
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
      const detail =
        await getChargingStationDetail(
          stationId
        );

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
          detail,
          regionLookup
        );

      setStations(
        (currentStations) =>
          currentStations.map(
            (item) =>
              item.id ===
              stationId
                ? normalizedDetail
                : item
          )
      );
    } catch (error) {
      console.error(
        "Istasyon detay bilgisi alinamadi:",
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
            item.id ===
            regionId
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

    setRegionSummary(
      null
    );

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
            feature.get(
              "regionId"
            ) === regionId;

          feature.set(
            "selected",
            isSelected
          );

          feature.changed();

          if (
            isSelected
          ) {
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
        "Bolge detay bilgisi alinamadi:",
        error
      );

      setRegionSummary({
        regionId,

        regionName:
          region.name,

        chargingStationCount:
          0,

        trafficLevel:
          "Veri alinamadi",

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
    setSelectedRegion(
      null
    );

    setRegionSummary(
      null
    );

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
      mapRef.current
    ) {
      mapRef.current
        .getView()
        .animate({
          center:
            CANKAYA_CENTER,

          zoom: 12.4,

          duration: 300,
        });
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
        "Istasyon listesi yenilenemedi:",
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
      return `${label} yukleniyor`;
    }

    if (
      status === "error"
    ) {
      return `${label} bulunamadi`;
    }

    return active
      ? `${label} acik`
      : `${label} kapali`;
  }

  return (
    <div
      className="existing-map"
      data-testid="existing-stations-map"
    >
      <div
        ref={
          mapElementRef
        }
        className="openlayers-map"
        data-testid="existing-stations-map-canvas"
      />

      <div
        className="map-layer-controls"
        data-testid="map-layer-controls"
      >
        <strong>
          Harita Katmanlari
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
          "2 / Bolgeler aktif"}

        {mapStep === 3 &&
          "3 / Bolge detayi"}
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
                  Yukleniyor...
                </p>
              ) : (
                <div className="region-summary-content">
                  <dl>
                    <div>
                      <dt>
                        Istasyon
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
                        Yaygin Soket
                      </dt>

                      <dd data-testid="region-summary-socket-type">
                        {regionSummary
                          ?.mostCommonSocketType ||
                          "Veri yok"}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Yaygin Guc
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
                      Firma Dagilimi
                    </span>

                    {(
                      regionSummary
                        ?.companyDistribution ||
                      []
                    )
                      .slice(
                        0,
                        4
                      )
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
              Bolgelere geri don
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
                    ? "Yukleniyor..."
                    : selectedStation.socketType}
                </dd>
              </div>

              <div>
                <dt>
                  Guc
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
          ? "Canli veri"
          : "Mock veri"}
      </div>
    </div>
  );
}