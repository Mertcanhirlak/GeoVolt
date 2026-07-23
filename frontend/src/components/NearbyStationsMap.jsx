import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Zap,
} from "lucide-react";

import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import Point from "ol/geom/Point";
import OlMap from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import { boundingExtent, getCenter } from "ol/extent";
import { fromLonLat } from "ol/proj";
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
  getChargingStationsWithSource,
} from "../services/mapDataApi";

import "./NearbyStationsMap.css";

const DEFAULT_CENTER = fromLonLat([
  32.8541,
  39.9208,
]);

const regionStyleCache = new Map();
function normalizeText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function normalizeSearchText(value) {
  return normalizeText(value)
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ");
}

function normalizeNumber(value) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}

function getRegionLabelGeometry(feature) {
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
        null,
      );

    return largestPolygon
      ?.getInteriorPoint();
  }

  return new Point(
    getCenter(
      geometry.getExtent(),
    ),
  );
}

function getRegionColor(
  regionIndex,
  isSelected,
) {
  const hue = Math.round(
    (Number(regionIndex) *
      137.508) %
      360,
  );

  return isSelected
    ? `hsla(${hue}, 88%, 47%, 0.66)`
    : `hsla(${hue}, 74%, 57%, 0.5)`;
}

function getRegionStrokeColor(
  regionIndex,
  isSelected,
) {
  const hue = Math.round(
    (Number(regionIndex) *
      137.508) %
      360,
  );

  return isSelected
    ? `hsl(${hue}, 92%, 30%)`
    : `hsl(${hue}, 82%, 38%)`;
}

function createRegionStyle(feature) {
  const regionIndex =
    feature.get(
      "regionColorIndex",
    ) ?? 0;

  const regionId =
    feature.get(
      "regionId",
    ) ?? regionIndex;

  const regionName = String(
    feature.get(
      "regionName",
    ) ?? "",
  ).trim();

  const isSelected =
    feature.get(
      "isUserRegion",
    ) === true;

  const cacheKey = [
    "nearby-region",
    regionId,
    regionName,
    isSelected
      ? "selected"
      : "default",
  ].join("-");

  if (
    regionStyleCache.has(
      cacheKey,
    )
  ) {
    return regionStyleCache.get(
      cacheKey,
    );
  }

  const polygonStyle =
    new Style({
      fill: new Fill({
        color: getRegionColor(
          regionIndex,
          isSelected,
        ),
      }),

      stroke: new Stroke({
        color: getRegionStrokeColor(
          regionIndex,
          isSelected,
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
            ? "700 13px Arial"
            : "700 11px Arial",

          fill: new Fill({
            color: isSelected
              ? "#ffffff"
              : "#0f172a",
          }),

          stroke: new Stroke({
            color: isSelected
              ? "rgba(15, 23, 42, 0.9)"
              : "rgba(255, 255, 255, 0.98)",

            width: 3,
          }),

          backgroundFill:
            new Fill({
              color: isSelected
                ? "rgba(30, 41, 59, 0.88)"
                : "rgba(255, 255, 255, 0.78)",
            }),

          backgroundStroke:
            new Stroke({
              color: isSelected
                ? "rgba(255, 255, 255, 0.75)"
                : "rgba(15, 23, 42, 0.28)",

              width: 1,
            }),

          padding: [
            3,
            5,
            3,
            5,
          ],

          overflow: true,
        }),
      }),
    );
  }

  regionStyleCache.set(
    cacheKey,
    styles,
  );

  return styles;
}
function getStationStyle(feature) {
  const isSelected =
    feature.get("selected") === true;

  const rank =
    feature.get("rank");

  return new Style({
    image: new CircleStyle({
      radius: isSelected
        ? 18
        : 15,

      fill: new Fill({
        color: isSelected
          ? "#f97316"
          : "#2563eb",
      }),

      stroke: new Stroke({
        color: "#ffffff",
        width: isSelected
          ? 4
          : 3,
      }),
    }),

    text: new Text({
      text: String(rank || "⚡"),

      font:
        '800 12px "Inter", "Segoe UI", sans-serif',

      fill: new Fill({
        color: "#ffffff",
      }),

      offsetY: 0,
    }),
  });
}

const USER_LOCATION_STYLE =
  new Style({
    image: new CircleStyle({
      radius: 10,

      fill: new Fill({
        color: "#22c55e",
      }),

      stroke: new Stroke({
        color: "#ffffff",
        width: 4,
      }),
    }),
  });

function getDistanceKm(
  firstLocation,
  secondLocation,
) {
  const firstLatitude =
    Number(firstLocation.latitude);

  const firstLongitude =
    Number(firstLocation.longitude);

  const secondLatitude =
    Number(secondLocation.latitude);

  const secondLongitude =
    Number(secondLocation.longitude);

  if (
    !Number.isFinite(firstLatitude) ||
    !Number.isFinite(firstLongitude) ||
    !Number.isFinite(secondLatitude) ||
    !Number.isFinite(secondLongitude)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const earthRadiusKm = 6371;

  const toRadians = (degree) =>
    (degree * Math.PI) / 180;

  const latitudeDifference =
    toRadians(
      secondLatitude -
        firstLatitude,
    );

  const longitudeDifference =
    toRadians(
      secondLongitude -
        firstLongitude,
    );

  const firstLatitudeRadians =
    toRadians(firstLatitude);

  const secondLatitudeRadians =
    toRadians(secondLatitude);

  const haversineValue =
    Math.sin(
      latitudeDifference / 2,
    ) ** 2 +
    Math.cos(
      firstLatitudeRadians,
    ) *
      Math.cos(
        secondLatitudeRadians,
      ) *
      Math.sin(
        longitudeDifference / 2,
      ) ** 2;

  const centralAngle =
    2 *
    Math.atan2(
      Math.sqrt(haversineValue),
      Math.sqrt(
        1 - haversineValue,
      ),
    );

  return earthRadiusKm *
    centralAngle;
}

function formatDistance(distanceKm) {
  if (!Number.isFinite(distanceKm)) {
    return "-";
  }

  if (distanceKm < 1) {
    return `${Math.round(
      distanceKm * 1000,
    )} m`;
  }

  return `${distanceKm.toFixed(
    1,
  )} km`;
}

function getStationPowerValue(station) {
  const candidates = [
    station.maxPowerKw,
    station.powerKw,
    station.SOKET_GUCU_KW,
    station.soketGucuKw,
    station.power,
  ];

  for (const candidate of candidates) {
    if (
      candidate === null ||
      candidate === undefined ||
      candidate === ""
    ) {
      continue;
    }

    const matchedValue =
      String(candidate).match(
        /-?\d+(?:[.,]\d+)?/,
      );

    if (!matchedValue) {
      continue;
    }

    const numericValue =
      Number(
        matchedValue[0].replace(
          ",",
          ".",
        ),
      );

    if (
      Number.isFinite(numericValue)
    ) {
      return numericValue;
    }
  }

  return null;
}

function getStationSocketTypes(station) {
  const values = [
    ...(Array.isArray(
      station.socketTypes,
    )
      ? station.socketTypes
      : []),

    ...(Array.isArray(
      station.connectorTypes,
    )
      ? station.connectorTypes
      : []),

    station.socketType,
    station.connectorType,
    station.SOKET_TIPI,
    station.SOKET_TURU,
  ];

  return [
    ...new Set(
      values
        .flatMap((value) =>
          normalizeText(value)
            .split(/[,+/]/)
            .map((item) =>
              item.trim(),
            ),
        )
        .filter(Boolean)
        .filter(
          (value) =>
            normalizeSearchText(
              value,
            ) !==
            "soket bilgisi yok",
        ),
    ),
  ];
}

function getStationGroupKey(station) {
  const stationNumber =
    normalizeText(
      station.sourceStationNumber ||
        station.ISTASYON_NO,
    );

  if (stationNumber) {
    return `station-number-${stationNumber}`;
  }

  const latitude =
    normalizeNumber(
      station.latitude,
    );

  const longitude =
    normalizeNumber(
      station.longitude,
    );

  return [
    normalizeSearchText(
      station.name,
    ),

    Number.isFinite(latitude)
      ? latitude.toFixed(5)
      : "no-latitude",

    Number.isFinite(longitude)
      ? longitude.toFixed(5)
      : "no-longitude",
  ].join("-");
}

function mergeChargingStations(
  stationData,
) {
  const groupedStations =
    new Map();

  stationData.forEach(
    (station) => {
      const latitude =
        normalizeNumber(
          station.latitude,
        );

      const longitude =
        normalizeNumber(
          station.longitude,
        );

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return;
      }

      const groupKey =
        getStationGroupKey(
          station,
        );

      const socketTypes =
        getStationSocketTypes(
          station,
        );

      const powerValue =
        getStationPowerValue(
          station,
        );

      const socketCountValue =
        normalizeNumber(
          station.socketCount,
        );

      if (
        !groupedStations.has(
          groupKey,
        )
      ) {
        groupedStations.set(
          groupKey,
          {
            ...station,

            id: groupKey,

            latitude,
            longitude,

            groupedSocketCount:
              socketCountValue &&
              socketCountValue > 0
                ? socketCountValue
                : 1,

            groupedSocketTypes:
              new Set(
                socketTypes,
              ),

            groupedPowerValues:
              Number.isFinite(
                powerValue,
              )
                ? [powerValue]
                : [],
          },
        );

        return;
      }

      const currentStation =
        groupedStations.get(
          groupKey,
        );

      socketTypes.forEach(
        (socketType) => {
          currentStation
            .groupedSocketTypes
            .add(socketType);
        },
      );

      if (
        Number.isFinite(
          powerValue,
        )
      ) {
        currentStation
          .groupedPowerValues
          .push(powerValue);
      }

      currentStation.groupedSocketCount +=
        socketCountValue &&
        socketCountValue > 0
          ? socketCountValue
          : 1;
    },
  );

  return Array.from(
    groupedStations.values(),
  ).map((station) => {
    const socketTypes =
      Array.from(
        station.groupedSocketTypes,
      );

    const maxPowerKw =
      station.groupedPowerValues
        .length > 0
        ? Math.max(
            ...station
              .groupedPowerValues,
          )
        : null;

    const {
      groupedSocketCount,
      groupedSocketTypes,
      groupedPowerValues,
      ...stationWithoutHelpers
    } = station;

    return {
      ...stationWithoutHelpers,

      socketCount:
        groupedSocketCount,

      socketTypes,

      socketType:
        socketTypes.join(" / ") ||
        "Soket bilgisi yok",

      maxPowerKw,

      power:
        Number.isFinite(
          maxPowerKw,
        )
          ? `${maxPowerKw} kW`
          : "Güç bilgisi yok",

      accessType:
        station.accessType ||
        station.HIZMET_SEKLI ||
        "Erişim bilgisi yok",

      brandName:
        station.brandName ||
        station.MARKAADI ||
        station.MARKA ||
        "Marka bilgisi yok",

      operatorName:
        station.operatorName ||
        station.SARJ_AGI_ISLETMECISI ||
        "İşletmeci bilgisi yok",
    };
  });
}

function getGeoLocationErrorMessage(
  error,
) {
  if (error?.code === 1) {
    return "Konum izni verilmedi. Tarayıcıdaki konum iznini açıp tekrar deneyin.";
  }

  if (error?.code === 2) {
    return "Konum bilgisi alınamadı. Cihazınızın konum servisinin açık olduğunu kontrol edin.";
  }

  if (error?.code === 3) {
    return "Konum isteği zaman aşımına uğradı. Tekrar deneyin.";
  }

  return "Konum alınırken beklenmeyen bir hata oluştu.";
}

function getRegionName(
  feature,
  index,
) {
  const properties =
    feature.getProperties();

  return (
    normalizeText(
      properties.NAME ||
        properties.name ||
        properties.MAHALLE ||
        properties.mahalle ||
        properties.MAHALLE_ADI ||
        properties.regionName,
    ) ||
    `Bölge ${index + 1}`
  );
}

function createRegionFeatures(
  geoJson,
) {
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
      },
    );

  features.forEach(
    (feature, index) => {
      feature.set(
        "featureType",
        "region",
      );

      feature.set(
        "regionName",
        getRegionName(
          feature,
          index,
        ),
      );

      feature.set(
        "regionColorIndex",
        index,
      );

      feature.set(
        "isUserRegion",
        false,
      );
    },
  );

  return features;
}

function findContainingRegion(
  userLocation,
  regionFeatures,
) {
  if (!userLocation) {
    return null;
  }

  const projectedCoordinate =
    fromLonLat([
      userLocation.longitude,
      userLocation.latitude,
    ]);

  return (
    regionFeatures.find(
      (feature) =>
        feature
          .getGeometry()
          ?.intersectsCoordinate(
            projectedCoordinate,
          ),
    ) || null
  );
}

function isStationInsideRegion(
  station,
  regionFeature,
) {
  if (!regionFeature) {
    return false;
  }

  return (
    regionFeature
      .getGeometry()
      ?.intersectsCoordinate(
        fromLonLat([
          station.longitude,
          station.latitude,
        ]),
      ) === true
  );
}

export default function NearbyStationsMap() {
  const mapElementRef =
    useRef(null);

  const mapRef =
    useRef(null);

  const regionSourceRef =
    useRef(
      new VectorSource(),
    );

  const stationSourceRef =
    useRef(
      new VectorSource(),
    );

  const userSourceRef =
    useRef(
      new VectorSource(),
    );

  const regionLayerRef =
    useRef(null);

  const stationLayerRef =
    useRef(null);

  const autoLocationRequestedRef =
    useRef(false);

  const [
    dataStatus,
    setDataStatus,
  ] = useState("loading");

  const [
    locationStatus,
    setLocationStatus,
  ] = useState("idle");

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  const [
    allStations,
    setAllStations,
  ] = useState([]);

  const [
    regionFeatures,
    setRegionFeatures,
  ] = useState([]);

  const [
    userLocation,
    setUserLocation,
  ] = useState(null);

  const [
    userRegion,
    setUserRegion,
  ] = useState(null);

  const [
    nearbyStations,
    setNearbyStations,
  ] = useState([]);

  const [
    selectedStation,
    setSelectedStation,
  ] = useState(null);

  const [
    dataSource,
    setDataSource,
  ] = useState("local");

  const [
    isGeneralFallback,
    setIsGeneralFallback,
  ] = useState(false);

  const requestUserLocation =
    useCallback(() => {
      if (
        !navigator.geolocation
      ) {
        setLocationStatus(
          "error",
        );

        setStatusMessage(
          "Tarayıcınız konum özelliğini desteklemiyor.",
        );

        return;
      }

      setLocationStatus(
        "loading",
      );

      setStatusMessage(
        "Konumunuz belirleniyor...",
      );

      navigator.geolocation
        .getCurrentPosition(
          (position) => {
            setUserLocation({
              latitude:
                position.coords
                  .latitude,

              longitude:
                position.coords
                  .longitude,

              accuracy:
                position.coords
                  .accuracy,
            });

            setLocationStatus(
              "ready",
            );
          },

          (error) => {
            setLocationStatus(
              "error",
            );

            setStatusMessage(
              getGeoLocationErrorMessage(
                error,
              ),
            );
          },

          {
            enableHighAccuracy:
              true,

            timeout: 15000,

            maximumAge: 60000,
          },
        );
    }, []);

  useEffect(() => {
    if (
      !mapElementRef.current ||
      mapRef.current
    ) {
      return undefined;
    }

    const regionLayer =
      new VectorLayer({
        source:
          regionSourceRef.current,

        style:
          createRegionStyle,

        declutter: true,

        renderBuffer: 100,

        zIndex: 2,
      });

    const stationLayer =
      new VectorLayer({
        source:
          stationSourceRef.current,

        style:
          getStationStyle,

        zIndex: 5,
      });

    const userLayer =
      new VectorLayer({
        source:
          userSourceRef.current,

        style:
          USER_LOCATION_STYLE,

        zIndex: 7,
      });

    regionLayerRef.current =
      regionLayer;

    stationLayerRef.current =
      stationLayer;

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
          stationLayer,
          userLayer,
        ],

        view: new View({
          center:
            DEFAULT_CENTER,

          zoom: 12.2,

          minZoom: 9.5,

          maxZoom: 19,
        }),
      });

    map.on(
      "singleclick",
      (event) => {
        const clickedFeature =
          map.forEachFeatureAtPixel(
            event.pixel,

            (feature) =>
              feature,

            {
              hitTolerance: 8,
            },
          );

        const station =
          clickedFeature?.get(
            "station",
          );

        if (station) {
          setSelectedStation(
            station,
          );
        }
      },
    );

    mapRef.current = map;

    return () => {
      map.setTarget(
        undefined,
      );

      mapRef.current =
        null;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadMapData() {
      setDataStatus(
        "loading",
      );

      setStatusMessage(
        "İstasyon ve mahalle verileri yükleniyor...",
      );

      try {
        const [
          stationResult,
          regionResponse,
        ] = await Promise.all([
          getChargingStationsWithSource(),

          fetch(
            "/data/MAHALLE.geojson",
          ),
        ]);

        if (
          !regionResponse.ok
        ) {
          throw new Error(
            `MAHALLE.geojson yüklenemedi: ${regionResponse.status}`,
          );
        }

        const regionGeoJson =
          await regionResponse.json();

        if (!isMounted) {
          return;
        }

        const normalizedStations =
          mergeChargingStations(
            Array.isArray(
              stationResult.data,
            )
              ? stationResult.data
              : [],
          );

        const parsedRegionFeatures =
          createRegionFeatures(
            regionGeoJson,
          );

        regionSourceRef.current
          .clear();

        regionSourceRef.current
          .addFeatures(
            parsedRegionFeatures,
          );

        setAllStations(
          normalizedStations,
        );

        setRegionFeatures(
          parsedRegionFeatures,
        );

        setDataSource(
          stationResult.source ||
            "local",
        );

        setDataStatus(
          "ready",
        );

        setStatusMessage(
          "",
        );
      } catch (error) {
        console.error(
          "Yakındaki istasyon verileri yüklenemedi:",
          error,
        );

        if (!isMounted) {
          return;
        }

        setDataStatus(
          "error",
        );

        setStatusMessage(
          "İstasyon veya mahalle verileri yüklenemedi. Sayfayı yenileyip tekrar deneyin.",
        );
      }
    }

    loadMapData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (
      dataStatus !== "ready" ||
      autoLocationRequestedRef.current
    ) {
      return;
    }

    autoLocationRequestedRef.current =
      true;

    requestUserLocation();
  }, [
    dataStatus,
    requestUserLocation,
  ]);

  useEffect(() => {
    if (
      !userLocation ||
      dataStatus !== "ready"
    ) {
      return;
    }

    const containingRegion =
      findContainingRegion(
        userLocation,
        regionFeatures,
      );

    regionFeatures.forEach(
      (feature) => {
        feature.set(
          "isUserRegion",
          feature ===
            containingRegion,
        );
      },
    );

    regionLayerRef.current
      ?.changed();

    const matchedRegionName =
      containingRegion?.get(
        "regionName",
      ) || null;

    setUserRegion(
      matchedRegionName
        ? {
            name:
              matchedRegionName,

            feature:
              containingRegion,
          }
        : null,
    );

    let stationCandidates =
      allStations;

    let generalFallback =
      false;

    if (containingRegion) {
      stationCandidates =
        allStations.filter(
          (station) =>
            isStationInsideRegion(
              station,
              containingRegion,
            ),
        );
    } else {
      generalFallback =
        true;
    }

    const rankedStations =
      stationCandidates
        .map((station) => ({
          ...station,

          distanceKm:
            getDistanceKm(
              userLocation,
              station,
            ),
        }))
        .filter(
          (station) =>
            Number.isFinite(
              station.distanceKm,
            ),
        )
        .sort(
          (firstStation, secondStation) =>
            firstStation.distanceKm -
            secondStation.distanceKm,
        )
        .slice(0, 5)
        .map(
          (station, index) => ({
            ...station,

            rank:
              index + 1,

            neighborhood:
              matchedRegionName ||
              station.neighborhood ||
              "Mahalle bilgisi yok",
          }),
        );

    setIsGeneralFallback(
      generalFallback,
    );

    setNearbyStations(
      rankedStations,
    );

    setSelectedStation(
      rankedStations[0] ||
        null,
    );

    if (
      containingRegion &&
      rankedStations.length > 0
    ) {
      setStatusMessage(
        `${matchedRegionName} mahallesindeki en yakın ${rankedStations.length} istasyon listelendi.`,
      );
    } else if (
      containingRegion
    ) {
      setStatusMessage(
        `${matchedRegionName} mahallesinde kayıtlı şarj istasyonu bulunamadı.`,
      );
    } else if (
      rankedStations.length > 0
    ) {
      setStatusMessage(
        "Konumunuz mahalle sınırlarıyla eşleştirilemedi. Genel olarak en yakın 5 istasyon gösteriliyor.",
      );
    } else {
      setStatusMessage(
        "Konumunuza yakın istasyon bulunamadı.",
      );
    }
  }, [
    allStations,
    dataStatus,
    regionFeatures,
    userLocation,
  ]);

  useEffect(() => {
    stationSourceRef.current
      .clear();

    nearbyStations.forEach(
      (station) => {
        const feature =
          new Feature({
            geometry:
              new Point(
                fromLonLat([
                  station.longitude,
                  station.latitude,
                ]),
              ),
          });

        feature.set(
          "featureType",
          "station",
        );

        feature.set(
          "station",
          station,
        );

        feature.set(
          "rank",
          station.rank,
        );

        feature.set(
          "selected",
          selectedStation?.id ===
            station.id,
        );

        stationSourceRef.current
          .addFeature(
            feature,
          );
      },
    );

    userSourceRef.current
      .clear();

    if (userLocation) {
      const userFeature =
        new Feature({
          geometry:
            new Point(
              fromLonLat([
                userLocation.longitude,
                userLocation.latitude,
              ]),
            ),
        });

      userFeature.set(
        "featureType",
        "user-location",
      );

      userSourceRef.current
        .addFeature(
          userFeature,
        );
    }

    stationLayerRef.current
      ?.changed();

    const map =
      mapRef.current;

    if (
      !map ||
      !userLocation
    ) {
      return;
    }

    const coordinates = [
      fromLonLat([
        userLocation.longitude,
        userLocation.latitude,
      ]),

      ...nearbyStations.map(
        (station) =>
          fromLonLat([
            station.longitude,
            station.latitude,
          ]),
      ),
    ];

    if (coordinates.length === 1) {
      map.getView().animate({
        center:
          coordinates[0],

        zoom: 15,

        duration: 700,
      });

      return;
    }

    map.getView().fit(
      boundingExtent(
        coordinates,
      ),

      {
        padding: [
          120,
          420,
          120,
          410,
        ],

        maxZoom: 15,

        duration: 800,
      },
    );
  }, [
    nearbyStations,
    userLocation,
  ]);

  useEffect(() => {
    stationSourceRef.current
      .getFeatures()
      .forEach(
        (feature) => {
          const station =
            feature.get(
              "station",
            );

          feature.set(
            "selected",
            station?.id ===
              selectedStation?.id,
          );
        },
      );

    stationLayerRef.current
      ?.changed();

    if (
      !selectedStation ||
      !mapRef.current
    ) {
      return;
    }

    mapRef.current
      .getView()
      .animate({
        center:
          fromLonLat([
            selectedStation.longitude,
            selectedStation.latitude,
          ]),

        zoom: 16.3,

        duration: 650,
      });
  }, [
    selectedStation,
  ]);

  function handleStationSelect(
    station,
  ) {
    setSelectedStation(
      station,
    );
  }

  const sourceLabel =
    dataSource === "api"
      ? "Canlı API verisi"
      : dataSource === "local"
        ? "Yerel GeoJSON verisi"
        : "Mock veri";

  return (
    <div
      className="nearby-stations-shell"
      data-testid="nearby-stations-map"
    >
      <div
        ref={mapElementRef}
        className="nearby-openlayers-map"
        data-testid="nearby-openlayers-map"
      />

      <header
        className="nearby-map-header"
        data-testid="nearby-map-header"
      >
        <div>
          <span>
            <Navigation
              size={17}
              strokeWidth={2.4}
            />

            Konuma göre arama
          </span>

          <strong>
            Yakınımdaki Şarj
            İstasyonları
          </strong>
        </div>

        <button
          type="button"
          className="nearby-location-button"
          data-testid="nearby-location-button"
          onClick={
            requestUserLocation
          }
          disabled={
            locationStatus ===
            "loading"
          }
        >
          {locationStatus ===
          "loading" ? (
            <RefreshCw
              size={18}
              className="nearby-spin"
            />
          ) : (
            <LocateFixed
              size={18}
            />
          )}

          {locationStatus ===
          "loading"
            ? "Konum bulunuyor"
            : "Konumumu yenile"}
        </button>
      </header>

      <aside
        className="nearby-stations-panel"
        data-testid="nearby-stations-panel"
      >
        <div className="nearby-panel-heading">
          <div>
            <span>
              Bulunduğunuz semt
            </span>

            <h1
              data-testid="nearby-user-region"
            >
              {userRegion?.name ||
                (locationStatus ===
                "loading"
                  ? "Tespit ediliyor..."
                  : "Henüz belirlenmedi")}
            </h1>
          </div>

          <div
            className="nearby-user-marker"
            aria-hidden="true"
          >
            <MapPin
              size={21}
            />
          </div>
        </div>

        <div
          className={
            dataStatus === "error" ||
            locationStatus ===
              "error"
              ? "nearby-status-message error"
              : isGeneralFallback
                ? "nearby-status-message warning"
                : "nearby-status-message"
          }
          data-testid="nearby-status-message"
        >
          {dataStatus ===
          "loading"
            ? "Veriler yükleniyor..."
            : statusMessage ||
              "Konum sonucunuz bekleniyor."}
        </div>

        <div className="nearby-panel-meta">
          <span
            data-testid="nearby-result-count"
          >
            {nearbyStations.length} sonuç
          </span>

          <span
            data-testid="nearby-data-source"
          >
            {sourceLabel}
          </span>
        </div>

        <div
          className="nearby-station-list"
          data-testid="nearby-station-list"
        >
          {nearbyStations.map(
            (station) => (
              <button
                type="button"
                key={station.id}
                className={
                  selectedStation?.id ===
                  station.id
                    ? "nearby-station-card selected"
                    : "nearby-station-card"
                }
                data-testid={`nearby-station-card-${station.rank}`}
                onClick={() =>
                  handleStationSelect(
                    station,
                  )
                }
              >
                <span className="nearby-station-rank">
                  {station.rank}
                </span>

                <span className="nearby-station-main">
                  <strong>
                    {station.name}
                  </strong>

                  <small>
                    {station.address}
                  </small>

                  <span className="nearby-station-tags">
                    <em>
                      {formatDistance(
                        station.distanceKm,
                      )}
                    </em>

                    <em>
                      {station.power}
                    </em>

                    <em>
                      {station.socketType}
                    </em>
                  </span>
                </span>

                <Zap
                  className="nearby-card-zap"
                  size={20}
                />
              </button>
            ),
          )}

          {dataStatus ===
            "ready" &&
            locationStatus !==
              "loading" &&
            nearbyStations.length ===
              0 && (
              <div
                className="nearby-empty-state"
                data-testid="nearby-empty-state"
              >
                <MapPin
                  size={30}
                />

                <strong>
                  İstasyon bulunamadı
                </strong>

                <p>
                  Konumunuzu yenileyin
                  veya konum izninizi
                  kontrol edin.
                </p>

                <button
                  type="button"
                  onClick={
                    requestUserLocation
                  }
                  data-testid="nearby-empty-retry-button"
                >
                  Tekrar Dene
                </button>
              </div>
            )}
        </div>
      </aside>

      {selectedStation && (
        <aside
          className="nearby-station-detail"
          data-testid="nearby-station-detail"
        >
          <button
            type="button"
            className="nearby-detail-close"
            data-testid="nearby-detail-close"
            onClick={() =>
              setSelectedStation(
                null,
              )
            }
            aria-label="İstasyon detayını kapat"
          >
            ×
          </button>

          <div className="nearby-detail-title">
            <span>
              <Zap
                size={23}
              />
            </span>

            <div>
              <small>
                {selectedStation.neighborhood}
              </small>

              <h2
                data-testid="nearby-selected-station-name"
              >
                {selectedStation.name}
              </h2>
            </div>
          </div>

          <p
            className="nearby-detail-address"
            data-testid="nearby-selected-station-address"
          >
            {selectedStation.address}
          </p>

          <dl className="nearby-detail-grid">
            <div>
              <dt>Uzaklık</dt>

              <dd data-testid="nearby-selected-distance">
                {formatDistance(
                  selectedStation.distanceKm,
                )}
              </dd>
            </div>

            <div>
              <dt>Durum</dt>

              <dd data-testid="nearby-selected-status">
                {selectedStation.status ||
                  "Aktif"}
              </dd>
            </div>

            <div>
              <dt>Marka</dt>

              <dd data-testid="nearby-selected-brand">
                {selectedStation.brandName}
              </dd>
            </div>

            <div>
              <dt>Güç</dt>

              <dd data-testid="nearby-selected-power">
                {selectedStation.power}
              </dd>
            </div>

            <div>
              <dt>Soket tipi</dt>

              <dd data-testid="nearby-selected-socket-type">
                {selectedStation.socketType}
              </dd>
            </div>

            <div>
              <dt>Soket sayısı</dt>

              <dd data-testid="nearby-selected-socket-count">
                {selectedStation.socketCount}
              </dd>
            </div>

            <div>
              <dt>Erişim</dt>

              <dd data-testid="nearby-selected-access-type">
                {selectedStation.accessType}
              </dd>
            </div>

            <div>
              <dt>İstasyon no</dt>

              <dd data-testid="nearby-selected-station-number">
                {selectedStation.sourceStationNumber ||
                  selectedStation.ISTASYON_NO ||
                  "-"}
              </dd>
            </div>
          </dl>

          <div className="nearby-detail-operator">
            <span>
              Şarj ağı işletmecisi
            </span>

            <strong data-testid="nearby-selected-operator">
              {selectedStation.operatorName}
            </strong>
          </div>

          <button
            type="button"
            className="nearby-focus-button"
            data-testid="nearby-focus-button"
            onClick={() =>
              handleStationSelect({
                ...selectedStation,
              })
            }
          >
            <LocateFixed
              size={18}
            />

            Haritada Göster
          </button>
        </aside>
      )}

      <div
        className="nearby-map-legend"
        data-testid="nearby-map-legend"
      >
        <span>
          <i className="nearby-legend-user" />

          Konumunuz
        </span>

        <span>
          <i className="nearby-legend-station" />

          En yakın istasyonlar
        </span>

        <span>
          <i className="nearby-legend-region" />

          Mahalle sınırları
        </span>
      </div>
    </div>
  );
}
