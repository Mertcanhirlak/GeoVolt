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
import { click } from "ol/events/condition";

import "ol/ol.css";

import {
  fromLonLat,
  toLonLat,
} from "ol/proj";

import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";

import {
  Circle as CircleStyle,
  Fill,
  Stroke,
  Style,
  Text,
} from "ol/style";

import {
  evaluateManualPin,
  locateRegionPoint,
} from "../services/manualPinApi";

import { getRegions } from "../services/regionsApi";

import { mapCandidatePoint } from "../utils/candidatePointMapper";

import "./CandidatePointsMap.css";

const CANKAYA_CENTER = fromLonLat([
  32.8541,
  39.9208,
]);

const CANKAYA_BOUNDS = {
  minLatitude: 39.72,
  maxLatitude: 40.08,
  minLongitude: 32.5,
  maxLongitude: 33.18,
};

const regionColors = [
  "rgba(74, 222, 128, 0.46)",
  "rgba(96, 165, 250, 0.43)",
  "rgba(250, 204, 21, 0.45)",
  "rgba(248, 113, 113, 0.42)",
  "rgba(192, 132, 252, 0.43)",
  "rgba(45, 212, 191, 0.43)",
];

const candidateStyleCache = new Map();

const manualPinStyle = new Style({
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
      color: "rgba(15, 23, 42, 0.85)",
      width: 2,
    }),

    font: "bold 12px Arial",
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

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  if (Array.isArray(result?.items)) {
    return result.items;
  }

  if (Array.isArray(result?.result)) {
    return result.result;
  }

  if (Array.isArray(result?.value)) {
    return result.value;
  }

  if (Array.isArray(result?.data?.items)) {
    return result.data.items;
  }

  if (Array.isArray(result?.data?.regions)) {
    return result.data.regions;
  }

  return [];
}

function isInsideCankaya(
  latitude,
  longitude
) {
  return (
    latitude >= CANKAYA_BOUNDS.minLatitude &&
    latitude <= CANKAYA_BOUNDS.maxLatitude &&
    longitude >= CANKAYA_BOUNDS.minLongitude &&
    longitude <= CANKAYA_BOUNDS.maxLongitude
  );
}

function normalizeCandidateForMap(candidate) {
  let latitude = Number(candidate?.latitude);
  let longitude = Number(candidate?.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
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
    const oldLatitude = latitude;

    latitude = longitude;
    longitude = oldLatitude;
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

function getCandidateColor(generalScore) {
  const score = Number(generalScore);

  if (!Number.isFinite(score)) {
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
    candidate.generalScore === null ||
    candidate.generalScore === undefined
      ? "?"
      : String(candidate.generalScore);

  const color = isSelected
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
    candidateStyleCache.has(cacheKey)
  ) {
    return candidateStyleCache.get(
      cacheKey
    );
  }

  const style = new Style({
    image: new CircleStyle({
      radius: isSelected ? 14 : 11,

      fill: new Fill({
        color,
      }),

      stroke: new Stroke({
        color: "#ffffff",
        width: isSelected ? 3 : 2,
      }),
    }),

    text: new Text({
      text: scoreText,

      fill: new Fill({
        color: "#ffffff",
      }),

      stroke: new Stroke({
        color: "rgba(15, 23, 42, 0.78)",
        width: 2,
      }),

      font: isSelected
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

function createCandidateFeature(
  candidate,
  selectedPointId
) {
  const normalizedCandidate =
    normalizeCandidateForMap(candidate);

  if (!normalizedCandidate) {
    return null;
  }

  const feature = new Feature({
    geometry: new Point(
      fromLonLat([
        normalizedCandidate.longitude,
        normalizedCandidate.latitude,
      ])
    ),

    candidate: normalizedCandidate,

    candidateId:
      normalizedCandidate.id,

    featureType: "candidate",
  });

  feature.setStyle(
    createCandidateStyle(
      normalizedCandidate,

      String(
        normalizedCandidate.id
      ) ===
        String(selectedPointId)
    )
  );

  return feature;
}

function createManualPinFeature(candidate) {
  if (!candidate) {
    return null;
  }

  const latitude = Number(
    candidate.latitude
  );

  const longitude = Number(
    candidate.longitude
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const feature = new Feature({
    geometry: new Point(
      fromLonLat([
        longitude,
        latitude,
      ])
    ),

    candidate,

    candidateId: candidate.id,

    featureType: "manual-pin",
  });

  feature.setStyle(manualPinStyle);

  return feature;
}

function parseRegionGeometry(region) {
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

  for (const value of possibleValues) {
    if (!value) {
      continue;
    }

    if (typeof value === "object") {
      return value;
    }

    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        continue;
      }
    }
  }

  return null;
}

function createRegionStyle(feature) {
  const regionIndex =
    feature.get("regionIndex") ?? 0;

  const isSelected =
    feature.get("selected") === true;

  const regionName =
    feature.get("name") ?? "";

  return new Style({
    fill: new Fill({
      color: isSelected
        ? "rgba(37, 99, 235, 0.46)"
        : regionColors[
            regionIndex %
              regionColors.length
          ],
    }),

    stroke: new Stroke({
      color: isSelected
        ? "#1d4ed8"
        : "rgba(239, 68, 68, 0.92)",

      width: isSelected ? 5 : 3,
    }),

    text: new Text({
      text: regionName,

      overflow: true,

      font: isSelected
        ? "bold 14px Arial"
        : "bold 11px Arial",

      fill: new Fill({
        color: "#0f172a",
      }),

      stroke: new Stroke({
        color: "rgba(255, 255, 255, 0.98)",
        width: 4,
      }),

      backgroundFill: new Fill({
        color: "rgba(255, 255, 255, 0.82)",
      }),

      padding: [3, 5, 3, 5],
    }),
  });
}

function createRegionFeatures(regions) {
  const parser = new GeoJSON();

  return regions.flatMap(
    (region, index) => {
      const regionGeometry =
        parseRegionGeometry(region);

      if (!regionGeometry) {
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
              getRegionId(region)
            );

            feature.set(
              "name",
              getRegionName(region)
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

function createManualCandidate(
  evaluation,
  locateResult
) {
  const regionName =
    evaluation.regionName ||
    locateResult.regionName ||
    "Bölge";

  const neighborhoodName =
    evaluation.neighborhoodName ||
    locateResult.neighborhoodName ||
    null;

  const estimatedAddress = [
    neighborhoodName,
    regionName,
    "Çankaya",
    "Ankara",
  ]
    .filter(Boolean)
    .join(" / ");

  const mappedCandidate =
    mapCandidatePoint(
      {
        id: `manual-${Date.now()}`,

        name: neighborhoodName
          ? `Manuel Aday - ${neighborhoodName}`
          : `Manuel Aday - ${regionName}`,

        estimatedAddress,

        regionId:
          evaluation.regionId ||
          locateResult.regionId,

        regionName,

        region: regionName,

        neighborhoodId:
          evaluation.neighborhoodId ||
          locateResult.neighborhoodId,

        neighborhoodName,

        neighborhood:
          neighborhoodName,

        estimatedCost:
          evaluation.estimatedCost,

        latitude:
          evaluation.latitude,

        longitude:
          evaluation.longitude,

        isManual: true,

        status: "missing",
      },
      0
    );

  return {
    ...mappedCandidate,

    isManual: true,

    costSource:
      evaluation.costSource || "",

    manualMessage:
      evaluation.message || "",

    status: "missing",
  };
}

export default function CandidatePointsMap({
  points = [],
  regions = [],
  regionsActive = false,
  selectedPointId = null,
  onPointSelect,
  onRegionSelect,
}) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);

  const candidateSourceRef = useRef(
    new VectorSource()
  );

  const regionSourceRef = useRef(
    new VectorSource()
  );

  const manualPinSourceRef = useRef(
    new VectorSource()
  );

  const candidateLayerRef =
    useRef(null);

  const regionLayerRef =
    useRef(null);

  const manualPinLayerRef =
    useRef(null);

  const regionSelectRef =
    useRef(null);

  const callbackRef = useRef({
    onPointSelect,
    onRegionSelect,
  });

  const interactionRef = useRef({
    manualPinMode: false,
    manualPinLoading: false,
  });

  const manualPinHandlerRef =
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
    manualPinLoading,
    setManualPinLoading,
  ] = useState(false);

  const [
    manualPinPoint,
    setManualPinPoint,
  ] = useState(null);

  const [
    manualPinMessage,
    setManualPinMessage,
  ] = useState("");

  const resolvedRegions = useMemo(() => {
    if (
      Array.isArray(regions) &&
      regions.length > 0
    ) {
      return regions;
    }

    return internalRegions;
  }, [
    regions,
    internalRegions,
  ]);

  const selectedRegionId =
    getRegionId(selectedRegion);

  const selectedRegionName =
    selectedRegion
      ? getRegionName(selectedRegion)
      : "";

  const safePoints = useMemo(() => {
    if (!Array.isArray(points)) {
      return [];
    }

    return points
      .map(normalizeCandidateForMap)
      .filter(Boolean);
  }, [points]);

  useEffect(() => {
    callbackRef.current = {
      onPointSelect,
      onRegionSelect,
    };
  }, [
    onPointSelect,
    onRegionSelect,
  ]);

  useEffect(() => {
    interactionRef.current = {
      manualPinMode,
      manualPinLoading,
    };

    if (mapElementRef.current) {
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
      Array.isArray(regions) &&
      regions.length > 0
    ) {
      setRegionLoadError("");
      return;
    }

    let isMounted = true;

    async function loadRegions() {
      try {
        const result =
          await getRegions();

        if (!isMounted) {
          return;
        }

        const safeRegions =
          extractRegionList(result);

        setInternalRegions(
          safeRegions
        );

        if (
          safeRegions.length === 0
        ) {
          setRegionLoadError(
            "Bölge geometrileri API cevabında bulunamadı."
          );
        } else {
          setRegionLoadError("");
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error(
          "Bölge verileri alınamadı:",
          error
        );

        setInternalRegions([]);

        setRegionLoadError(
          "Bölge verileri yüklenemedi."
        );
      }
    }

    loadRegions();

    return () => {
      isMounted = false;
    };
  }, [regions]);

  async function handleManualPinCoordinate({
    latitude,
    longitude,
  }) {
    if (!selectedRegionId) {
      setManualPinMessage(
        "Önce haritadaki renkli bölgelerden birini seçmelisiniz."
      );

      return;
    }

    if (manualPinLoading) {
      return;
    }

    setManualPinLoading(true);

    setManualPinMessage(
      "Noktanın bölge ve mahalle kontrolü yapılıyor..."
    );

    try {
      const locateResult =
        await locateRegionPoint(
          selectedRegionId,
          {
            latitude,
            longitude,
          }
        );

      if (
        !locateResult.isInsideRegion
      ) {
        setManualPinMessage(
          "Seçtiğiniz nokta seçili bölgenin dışında. Bölgenin içine tekrar tıklayın."
        );

        return;
      }

      setManualPinMessage(
        "Tahmini maliyet hesaplanıyor..."
      );

      const evaluation =
        await evaluateManualPin({
          regionId:
            selectedRegionId,

          latitude,
          longitude,
        });

      if (!evaluation.isValid) {
        setManualPinMessage(
          evaluation.message ||
            "Manuel pin değerlendirilemedi."
        );

        return;
      }

      const manualCandidate =
        createManualCandidate(
          evaluation,
          locateResult
        );

      setManualPinPoint(
        manualCandidate
      );

      setManualPinMode(false);

      setManualPinMessage(
        evaluation.message ||
          "Manuel pin başarıyla değerlendirildi."
      );

      callbackRef.current
        .onPointSelect?.(
          manualCandidate
        );
    } catch (error) {
      console.error(
        "Manuel pin işlemi başarısız:",
        error
      );

      setManualPinMessage(
        error instanceof Error
          ? error.message
          : "Manuel pin işlemi sırasında hata oluştu."
      );
    } finally {
      setManualPinLoading(false);
    }
  }

  manualPinHandlerRef.current =
    handleManualPinCoordinate;

  function toggleManualPinMode() {
    if (!regionsActive) {
      setManualPinMessage(
        "Önce Bölgeler aktif seçeneğini açın."
      );

      return;
    }

    if (!selectedRegionId) {
      setManualPinMessage(
        "Önce haritadaki renkli bölgelerden birini seçin."
      );

      return;
    }

    if (manualPinLoading) {
      return;
    }

    setManualPinMode(
      (currentValue) => {
        const nextValue =
          !currentValue;

        setManualPinMessage(
          nextValue
            ? `${selectedRegionName} içinde manuel pin bırakmak için haritaya tıklayın.`
            : "Manuel pin modu kapatıldı."
        );

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

    const baseLayer =
      new TileLayer({
        source: new OSM({
          wrapX: false,
          crossOrigin: "anonymous",
        }),

        zIndex: 0,
      });

    const regionLayer =
      new VectorLayer({
        source:
          regionSourceRef.current,

        style: createRegionStyle,

        visible: false,

        zIndex: 3,
      });

    const candidateLayer =
      new VectorLayer({
        source:
          candidateSourceRef.current,

        zIndex: 6,
      });

    const manualPinLayer =
      new VectorLayer({
        source:
          manualPinSourceRef.current,

        zIndex: 8,
      });

    const map = new OlMap({
      target:
        mapElementRef.current,

      layers: [
        baseLayer,
        regionLayer,
        candidateLayer,
        manualPinLayer,
      ],

      view: new View({
        center: CANKAYA_CENTER,
        zoom: 12.2,
        minZoom: 9.5,
        maxZoom: 19,
      }),

      controls: [],
    });

    /*
     * Bölge tıklamasını normal map click yerine
     * OpenLayers Select interaction yönetiyor.
     */
    const regionSelectInteraction =
      new Select({
        layers: [regionLayer],

        style: null,

        hitTolerance: 12,

        filter: (feature) =>
          feature.get(
            "featureType"
          ) === "region",

        condition: (event) => {
          if (
            interactionRef.current
              .manualPinMode ||
            interactionRef.current
              .manualPinLoading
          ) {
            return false;
          }

          const candidateHit =
            event.map.hasFeatureAtPixel(
              event.pixel,
              {
                hitTolerance: 8,

                layerFilter:
                  (layer) =>
                    layer ===
                      candidateLayer ||
                    layer ===
                      manualPinLayer,
              }
            );

          return (
            !candidateHit &&
            click(event)
          );
        },
      });

    regionSelectInteraction.on(
      "select",
      (event) => {
        const regionFeature =
          event.selected?.[0];

        if (!regionFeature) {
          return;
        }

        const region =
          regionFeature.get(
            "region"
          );

        const clickedRegionId =
          regionFeature.get(
            "regionId"
          );

        setSelectedRegion(region);

        setManualPinMode(false);

        setManualPinMessage(
          `${getRegionName(
            region
          )} bölgesi seçildi. Manuel pin ekleyebilirsiniz.`
        );

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
                String(
                  clickedRegionId
                );

              feature.set(
                "selected",
                isSelected
              );

              feature.changed();
            }
          );

        const regionExtent =
          regionFeature
            .getGeometry()
            ?.getExtent();

        if (regionExtent) {
          map
            .getView()
            .fit(regionExtent, {
              padding: [
                110,
                390,
                110,
                260,
              ],

              maxZoom: 15,

              duration: 450,
            });
        }

        callbackRef.current
          .onRegionSelect?.(
            region
          );

        /*
         * Select interaction'ın kendi seçim koleksiyonunu
         * temizliyoruz. Seçili görünüm bizim selected
         * özelliğimiz üzerinden yönetiliyor.
         */
        regionSelectInteraction
          .getFeatures()
          .clear();
      }
    );

    map.addInteraction(
      regionSelectInteraction
    );

    /*
     * Manuel pin ve aday nokta tıklamaları burada yönetilir.
     * Bölge tıklaması Select interaction tarafından yönetilir.
     */
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
          ] = toLonLat(
            event.coordinate
          );

          manualPinHandlerRef.current?.({
            latitude,
            longitude,
          });

          return;
        }

        const candidateFeature =
          map.forEachFeatureAtPixel(
            event.pixel,

            (feature, layer) => {
              if (
                layer !==
                  candidateLayer &&
                layer !==
                  manualPinLayer
              ) {
                return undefined;
              }

              const featureType =
                feature.get(
                  "featureType"
                );

              if (
                featureType ===
                  "candidate" ||
                featureType ===
                  "manual-pin"
              ) {
                return feature;
              }

              return undefined;
            },

            {
              hitTolerance: 8,
            }
          );

        if (!candidateFeature) {
          return;
        }

        const candidate =
          candidateFeature.get(
            "candidate"
          );

        callbackRef.current
          .onPointSelect?.(
            candidate
          );
      }
    );

    map.on(
      "pointermove",
      (event) => {
        if (
          interactionRef.current
            .manualPinMode
        ) {
          map.getTargetElement().style.cursor =
            "crosshair";

          return;
        }

        const hasClickableFeature =
          map.hasFeatureAtPixel(
            event.pixel,
            {
              hitTolerance: 6,

              layerFilter:
                (layer) =>
                  layer ===
                    regionLayer ||
                  layer ===
                    candidateLayer ||
                  layer ===
                    manualPinLayer,
            }
          );

        map.getTargetElement().style.cursor =
          hasClickableFeature
            ? "pointer"
            : "default";
      }
    );

    mapRef.current = map;

    candidateLayerRef.current =
      candidateLayer;

    regionLayerRef.current =
      regionLayer;

    manualPinLayerRef.current =
      manualPinLayer;

    regionSelectRef.current =
      regionSelectInteraction;

    const resizeObserver =
      new ResizeObserver(() => {
        map.updateSize();
      });

    resizeObserver.observe(
      mapElementRef.current
    );

    return () => {
      resizeObserver.disconnect();

      map.removeInteraction(
        regionSelectInteraction
      );

      map.setTarget(undefined);

      mapRef.current = null;

      candidateLayerRef.current =
        null;

      regionLayerRef.current =
        null;

      manualPinLayerRef.current =
        null;

      regionSelectRef.current =
        null;
    };
  }, []);

  useEffect(() => {
    const candidateFeatures =
      safePoints
        .map((candidate) =>
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
        manualPinPoint
      );

    manualPinSourceRef.current.clear();

    if (manualFeature) {
      manualPinSourceRef.current.addFeature(
        manualFeature
      );
    }
  }, [manualPinPoint]);

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
      regionFeatures.length === 0 &&
      resolvedRegions.length > 0
    ) {
      setRegionLoadError(
        "Bölge listesi geldi fakat polygon geometrisi bulunamadı."
      );
    } else if (
      regionFeatures.length > 0
    ) {
      setRegionLoadError("");
    }
  }, [resolvedRegions]);

  useEffect(() => {
    if (
      regionLayerRef.current
    ) {
      regionLayerRef.current.setVisible(
        Boolean(regionsActive)
      );
    }

    regionSelectRef.current?.setActive(
      Boolean(regionsActive)
    );

    if (!mapRef.current) {
      return;
    }

    if (!regionsActive) {
      setSelectedRegion(null);

      setManualPinMode(false);

      setManualPinMessage("");

      regionSourceRef.current
        .getFeatures()
        .forEach((feature) => {
          feature.set(
            "selected",
            false
          );

          feature.changed();
        });

      mapRef.current
        .getView()
        .animate({
          center: CANKAYA_CENTER,
          zoom: 12.2,
          duration: 350,
        });

      return;
    }

    const regionExtent =
      regionSourceRef.current
        .getExtent();

    if (
      regionExtent &&
      Number.isFinite(
        regionExtent[0]
      )
    ) {
      mapRef.current
        .getView()
        .fit(regionExtent, {
          padding: [
            100,
            350,
            90,
            100,
          ],

          maxZoom: 12.5,

          duration: 450,
        });
    }
  }, [
    regionsActive,
    resolvedRegions,
  ]);

  useEffect(() => {
    regionSourceRef.current
      .getFeatures()
      .forEach((feature) => {
        const isSelected =
          selectedRegionId !== null &&
          String(
            feature.get(
              "regionId"
            )
          ) ===
            String(
              selectedRegionId
            );

        feature.set(
          "selected",
          isSelected
        );

        feature.changed();
      });
  }, [
    selectedRegionId,
    resolvedRegions,
  ]);

  useEffect(() => {
    if (
      !mapRef.current ||
      safePoints.length === 0 ||
      selectedPointId !== null ||
      regionsActive
    ) {
      return;
    }

    const extent =
      candidateSourceRef.current
        .getExtent();

    if (
      !extent ||
      !Number.isFinite(extent[0])
    ) {
      return;
    }

    mapRef.current
      .getView()
      .fit(extent, {
        padding: [
          100,
          360,
          100,
          100,
        ],

        maxZoom: 14.5,

        duration: 450,
      });
  }, [
    safePoints,
    selectedPointId,
    regionsActive,
  ]);

  useEffect(() => {
    if (
      !mapRef.current ||
      selectedPointId === null
    ) {
      return;
    }

    const selectedCandidate =
      safePoints.find(
        (candidate) =>
          String(candidate.id) ===
          String(selectedPointId)
      );

    if (!selectedCandidate) {
      return;
    }

    mapRef.current
      .getView()
      .animate({
        center: fromLonLat([
          selectedCandidate.longitude,
          selectedCandidate.latitude,
        ]),

        zoom: 16,

        duration: 450,
      });
  }, [
    selectedPointId,
    safePoints,
  ]);

  useEffect(() => {
    if (
      !mapRef.current ||
      !manualPinPoint
    ) {
      return;
    }

    mapRef.current
      .getView()
      .animate({
        center: fromLonLat([
          Number(
            manualPinPoint.longitude
          ),

          Number(
            manualPinPoint.latitude
          ),
        ]),

        zoom: 16,

        duration: 450,
      });
  }, [manualPinPoint]);

  const totalPointCount =
    safePoints.length +
    (manualPinPoint ? 1 : 0);

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
        ref={mapElementRef}
        className="candidate-points-map-canvas"
      />

      <div
        className="candidate-map-count"
        data-testid="candidate-map-count"
      >
        {totalPointCount} aday nokta
      </div>

      <div className="candidate-manual-controls">
        <div className="candidate-selected-region">
          <strong>
            Seçili Bölge
          </strong>

          <span>
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

      <div className="candidate-map-legend">
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
            {regionLoadError}
          </div>
        )}

      {manualPinMessage && (
        <div
          className="manual-pin-message"
          data-testid="manual-pin-message"
        >
          {manualPinMessage}
        </div>
      )}

      {regionsActive &&
  safePoints.length === 0 &&
  !manualPinPoint &&
  !manualPinMode &&
  !manualPinLoading && (
    <div
      className="candidate-map-empty"
      data-testid="candidate-map-empty"
    >
      Gerçek aday nokta verisi henüz
      bulunamadı. Bölge seçerek manuel
      pin değerlendirmesi yapabilirsiniz.
    </div>
  )}
    </div>
  );
}