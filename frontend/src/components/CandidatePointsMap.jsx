import {
  useEffect,
  useMemo,
  useRef,
} from "react";
import Feature from "ol/Feature";
import OlMap from "ol/Map";
import View from "ol/View";
import GeoJSON from "ol/format/GeoJSON";
import Point from "ol/geom/Point";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import "ol/ol.css";
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
import "./CandidatePointsMap.css";

const CANKAYA_CENTER = fromLonLat([
  32.8541,
  39.9208,
]);

const regionColors = [
  "rgba(74, 222, 128, 0.33)",
  "rgba(96, 165, 250, 0.31)",
  "rgba(250, 204, 21, 0.31)",
  "rgba(248, 113, 113, 0.3)",
  "rgba(192, 132, 252, 0.31)",
  "rgba(45, 212, 191, 0.31)",
];

const regionStyleCache = new Map();
const candidateStyleCache = new Map();

function isValidCoordinate(value) {
  return Number.isFinite(Number(value));
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

  if (candidateStyleCache.has(cacheKey)) {
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
  const latitude = Number(
    candidate.latitude
  );

  const longitude = Number(
    candidate.longitude
  );

  if (
    !isValidCoordinate(latitude) ||
    !isValidCoordinate(longitude)
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
    featureType: "candidate",
  });

  feature.setStyle(
    createCandidateStyle(
      candidate,
      String(candidate.id) ===
        String(selectedPointId)
    )
  );

  return feature;
}

function parseRegionGeometry(region) {
  const possibleValues = [
    region.boundaryGeoJson,
    region.boundaryGeoJSON,
    region.boundary,
    region.geometry,
    region.geoJson,
    region.geoJSON,
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

  const cacheKey = `${
    regionIndex % regionColors.length
  }-${isSelected ? "selected" : "default"}`;

  if (regionStyleCache.has(cacheKey)) {
    return regionStyleCache.get(
      cacheKey
    );
  }

  const style = new Style({
    fill: new Fill({
      color: isSelected
        ? "rgba(37, 99, 235, 0.28)"
        : regionColors[
            regionIndex %
              regionColors.length
          ],
    }),

    stroke: new Stroke({
      color: isSelected
        ? "#2563eb"
        : "rgba(220, 38, 38, 0.82)",

      width: isSelected ? 4 : 2.6,
    }),
  });

  regionStyleCache.set(
    cacheKey,
    style
  );

  return style;
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
              region.id
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

  const candidateLayerRef =
    useRef(null);

  const regionLayerRef = useRef(null);

  const callbackRef = useRef({
    onPointSelect,
    onRegionSelect,
  });

  const safePoints = useMemo(() => {
    if (!Array.isArray(points)) {
      return [];
    }

    return points.filter(
      (candidate) =>
        isValidCoordinate(
          candidate.latitude
        ) &&
        isValidCoordinate(
          candidate.longitude
        )
    );
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

        style: createRegionStyle,

        visible: false,

        zIndex: 2,
      });

    const candidateLayer =
      new VectorLayer({
        source:
          candidateSourceRef.current,

        zIndex: 5,
      });

    const map = new OlMap({
      target: mapElementRef.current,

      layers: [
        new TileLayer({
          source: new OSM(),
        }),

        regionLayer,

        candidateLayer,
      ],

      view: new View({
        center: CANKAYA_CENTER,
        zoom: 12.3,
        minZoom: 10,
        maxZoom: 19,
      }),

      controls: [],
    });

    map.on(
      "singleclick",
      (event) => {
        const feature =
          map.forEachFeatureAtPixel(
            event.pixel,
            (currentFeature) =>
              currentFeature,
            {
              hitTolerance: 8,
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
          "candidate"
        ) {
          const candidate =
            feature.get(
              "candidate"
            );

          callbackRef.current
            .onPointSelect?.(
              candidate
            );

          return;
        }

        if (
          featureType ===
          "region"
        ) {
          const region =
            feature.get("region");

          regionSourceRef.current
            .getFeatures()
            .forEach(
              (
                regionFeature
              ) => {
                const isSelected =
                  regionFeature.get(
                    "regionId"
                  ) ===
                  feature.get(
                    "regionId"
                  );

                regionFeature.set(
                  "selected",
                  isSelected
                );

                regionFeature.changed();
              }
            );

          const regionExtent =
            feature
              .getGeometry()
              ?.getExtent();

          if (regionExtent) {
            map
              .getView()
              .fit(regionExtent, {
                padding: [
                  100,
                  340,
                  100,
                  100,
                ],

                maxZoom: 15,

                duration: 450,
              });
          }

          callbackRef.current
            .onRegionSelect?.(
              region
            );
        }
      }
    );

    mapRef.current = map;
    candidateLayerRef.current =
      candidateLayer;
    regionLayerRef.current =
      regionLayer;

    const resizeObserver =
      new ResizeObserver(() => {
        map.updateSize();
      });

    resizeObserver.observe(
      mapElementRef.current
    );

    return () => {
      resizeObserver.disconnect();

      map.setTarget(undefined);

      mapRef.current = null;
      candidateLayerRef.current =
        null;
      regionLayerRef.current = null;
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
    const regionFeatures =
      createRegionFeatures(regions);

    regionSourceRef.current.clear();

    regionSourceRef.current.addFeatures(
      regionFeatures
    );
  }, [regions]);

  useEffect(() => {
    if (regionLayerRef.current) {
      regionLayerRef.current.setVisible(
        regionsActive
      );
    }

    if (!regionsActive) {
      regionSourceRef.current
        .getFeatures()
        .forEach((feature) => {
          feature.set(
            "selected",
            false
          );

          feature.changed();
        });
    }
  }, [regionsActive]);

  useEffect(() => {
    if (
      !mapRef.current ||
      safePoints.length === 0 ||
      selectedPointId !== null
    ) {
      return;
    }

    const extent =
      candidateSourceRef.current.getExtent();

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
          340,
          100,
          100,
        ],

        maxZoom: 14.5,

        duration: 450,
      });
  }, [
    safePoints,
    selectedPointId,
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
          Number(
            selectedCandidate.longitude
          ),

          Number(
            selectedCandidate.latitude
          ),
        ]),

        zoom: 16,

        duration: 450,
      });
  }, [
    selectedPointId,
    safePoints,
  ]);

  return (
    <div
      className="candidate-points-map"
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
        {safePoints.length} aday nokta
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
      </div>

      {safePoints.length === 0 && (
        <div
          className="candidate-map-empty"
          data-testid="candidate-map-empty"
        >
          Haritada gösterilecek aday nokta
          bulunamadı.
        </div>
      )}
    </div>
  );
}