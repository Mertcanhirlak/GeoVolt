import React, { useEffect, useMemo, useRef, useState } from "react";
import "ol/ol.css";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import Point from "ol/geom/Point";
import OlMap from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style";
import "./CandidatePointsMap.css";

const CANKAYA_CENTER = [32.8541, 39.9208];

const regionColors = [
  "rgba(34, 197, 94, 0.28)",
  "rgba(59, 130, 246, 0.26)",
  "rgba(250, 204, 21, 0.31)",
  "rgba(236, 72, 153, 0.25)",
  "rgba(45, 212, 191, 0.28)",
  "rgba(168, 85, 247, 0.24)",
];

const geoJsonFormat = new GeoJSON();

function formatMoney(value) {
  if (value === null || value === undefined) {
    return "Veri Eksik";
  }

  return `${Number(value).toLocaleString("tr-TR")} TL`;
}

function showScore(value) {
  return value === null || value === undefined ? "Veri Eksik" : value;
}

function hasCoordinates(candidate) {
  return Number.isFinite(Number(candidate?.longitude)) && Number.isFinite(Number(candidate?.latitude));
}

function countCandidatesInRegion(candidates, region) {
  const regionName = String(region?.name || "").toLocaleLowerCase("tr-TR");

  return candidates.filter((candidate) => {
    const candidateRegion = String(candidate?.region || "").toLocaleLowerCase("tr-TR");
    const candidateNeighborhood = String(candidate?.neighborhood || "").toLocaleLowerCase("tr-TR");
    return candidateRegion === regionName || candidateNeighborhood === regionName;
  }).length;
}

function candidateStyle(isSelected) {
  return new Style({
    image: new CircleStyle({
      radius: isSelected ? 8 : 6,
      fill: new Fill({ color: isSelected ? "#16a34a" : "#2563eb" }),
      stroke: new Stroke({ color: "#ffffff", width: isSelected ? 4 : 3 }),
    }),
  });
}

function regionStyle(feature) {
  const index = feature.get("regionIndex") || 0;
  const count = feature.get("candidateCount") || 0;
  const selected = Boolean(feature.get("selected"));

  return new Style({
    fill: new Fill({
      color: selected ? "rgba(132, 255, 80, 0.48)" : regionColors[index % regionColors.length],
    }),
    stroke: new Stroke({
      color: selected ? "#ef4444" : "rgba(239, 68, 68, 0.86)",
      width: selected ? 4 : 3,
    }),
    text: new Text({
      text: String(count),
      font: "800 14px Arial, sans-serif",
      fill: new Fill({ color: "#ffffff" }),
      stroke: new Stroke({ color: "#2563eb", width: 10 }),
      overflow: true,
    }),
  });
}

function createRegionFeatures(regions, candidates) {
  return regions.flatMap((region, index) => {
    if (!region?.boundaryGeoJson) {
      return [];
    }

    try {
      const geoJson = JSON.parse(region.boundaryGeoJson);
      const features = geoJsonFormat.readFeatures(geoJson, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });

      return features.map((feature) => {
        feature.set("type", "region");
        feature.set("region", region);
        feature.set("regionIndex", index);
        feature.set("candidateCount", countCandidatesInRegion(candidates, region));
        feature.setStyle(regionStyle);
        return feature;
      });
    } catch (error) {
      console.warn("Region GeoJSON okunamadi", region, error);
      return [];
    }
  });
}

export default function CandidatePointsMap({
  candidates,
  regions = [],
  selectedCandidate,
  onSelectCandidate,
  onClearCandidate,
  onSaveCandidate,
}) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const candidateSourceRef = useRef(new VectorSource());
  const regionSourceRef = useRef(new VectorSource());
  const regionLayerRef = useRef(null);
  const callbacksRef = useRef({ onSelectCandidate, onClearCandidate });
  const regionActiveRef = useRef(false);
  const [popupPosition, setPopupPosition] = useState(null);
  const [regionsActive, setRegionsActive] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);

  const candidatesWithCoordinates = useMemo(
    () => candidates.filter((candidate) => hasCoordinates(candidate)),
    [candidates]
  );

  useEffect(() => {
    callbacksRef.current = { onSelectCandidate, onClearCandidate };
  }, [onSelectCandidate, onClearCandidate]);

  useEffect(() => {
    regionActiveRef.current = regionsActive;

    if (regionLayerRef.current) {
      regionLayerRef.current.setVisible(regionsActive);
    }

    if (!regionsActive) {
      setSelectedRegion(null);
      regionSourceRef.current.getFeatures().forEach((feature) => {
        feature.set("selected", false);
        feature.changed();
      });
    }
  }, [regionsActive]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return undefined;
    }

    const regionLayer = new VectorLayer({
      source: regionSourceRef.current,
      visible: false,
      zIndex: 1,
    });

    const candidateLayer = new VectorLayer({
      source: candidateSourceRef.current,
      zIndex: 2,
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
        center: fromLonLat(CANKAYA_CENTER),
        zoom: 12,
      }),
      controls: [],
    });

    function selectRegion(feature) {
      const region = feature.get("region");
      setSelectedRegion(region);

      regionSourceRef.current.getFeatures().forEach((item) => {
        item.set("selected", item === feature);
        item.changed();
      });

      const extent = feature.getGeometry().getExtent();
      map.getView().fit(extent, {
        padding: [100, 360, 90, 90],
        maxZoom: 15,
        duration: 350,
      });
    }

    function handleClick(event) {
      const feature = map.forEachFeatureAtPixel(event.pixel, (clickedFeature) => clickedFeature, {
        hitTolerance: 8,
      });

      if (!feature) {
        callbacksRef.current.onClearCandidate();
        return;
      }

      if (feature.get("type") === "candidate") {
        callbacksRef.current.onSelectCandidate(feature.get("candidate"));
        return;
      }

      if (regionActiveRef.current && feature.get("type") === "region") {
        callbacksRef.current.onClearCandidate();
        selectRegion(feature);
      }
    }

    function handlePointerMove(event) {
      const hit = map.hasFeatureAtPixel(event.pixel, { hitTolerance: 8 });
      map.getTargetElement().style.cursor = hit ? "pointer" : "";
    }

    map.on("singleclick", handleClick);
    map.on("pointermove", handlePointerMove);

    mapRef.current = map;
    regionLayerRef.current = regionLayer;

    setTimeout(() => map.updateSize(), 0);

    return () => {
      map.un("singleclick", handleClick);
      map.un("pointermove", handlePointerMove);
      map.setTarget(undefined);
      mapRef.current = null;
      regionLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    candidateSourceRef.current.clear();

    candidatesWithCoordinates.forEach((candidate) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([Number(candidate.longitude), Number(candidate.latitude)])),
      });

      feature.set("type", "candidate");
      feature.set("candidate", candidate);
      feature.setStyle(candidateStyle(selectedCandidate?.id === candidate.id));
      candidateSourceRef.current.addFeature(feature);
    });
  }, [candidatesWithCoordinates, selectedCandidate]);

  useEffect(() => {
    regionSourceRef.current.clear();
    regionSourceRef.current.addFeatures(createRegionFeatures(regions, candidatesWithCoordinates));
  }, [regions, candidatesWithCoordinates]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || candidatesWithCoordinates.length === 0 || selectedCandidate) {
      return;
    }

    const extent = candidateSourceRef.current.getExtent();
    if (Number.isFinite(extent[0])) {
      map.getView().fit(extent, {
        padding: [140, 360, 120, 140],
        maxZoom: 14,
        duration: 300,
      });
    }
  }, [candidatesWithCoordinates, selectedCandidate]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedCandidate || !hasCoordinates(selectedCandidate)) {
      setPopupPosition(null);
      return undefined;
    }

    const coordinate = fromLonLat([Number(selectedCandidate.longitude), Number(selectedCandidate.latitude)]);

    function updatePopupPosition() {
      const pixel = map.getPixelFromCoordinate(coordinate);
      setPopupPosition({ left: pixel[0], top: pixel[1] });
    }

    map.getView().animate({
      center: coordinate,
      zoom: Math.max(map.getView().getZoom() || 12, 14),
      duration: 250,
    });

    updatePopupPosition();
    map.on("moveend", updatePopupPosition);
    map.on("postrender", updatePopupPosition);

    return () => {
      map.un("moveend", updatePopupPosition);
      map.un("postrender", updatePopupPosition);
    };
  }, [selectedCandidate]);

  return (
    <div className="candidate-ol-map-shell">
      <div ref={mapElementRef} className="candidate-ol-map" />

      <button
        type="button"
        className={regionsActive ? "candidate-region-toggle active" : "candidate-region-toggle"}
        onClick={() => setRegionsActive((current) => !current)}
      >
        Bolgeler: {regionsActive ? "Aktif" : "Inaktif"}
      </button>

      {regionsActive && selectedRegion && (
        <button
          type="button"
          className="candidate-region-scan"
          onClick={() => setRegionsActive(false)}
        >
          Bolgelere geri don
        </button>
      )}

      {regionsActive && selectedRegion && (
        <div className="candidate-selected-region-chip">
          Secili bolge: <strong>{selectedRegion.name}</strong>
        </div>
      )}

      {selectedCandidate && popupPosition && (
        <div
          className="candidate-ol-popup"
          data-testid={`map-candidate-popup-${selectedCandidate.id}`}
          style={{
            left: popupPosition.left,
            top: popupPosition.top,
          }}
        >
          <button
            className="candidate-ol-popup-close"
            type="button"
            data-testid="candidate-popup-close-button"
            onClick={onClearCandidate}
          >
            x
          </button>

          <small>{selectedCandidate.estimatedAddress}</small>
          <h3 data-testid={`popup-candidate-name-${selectedCandidate.id}`}>{selectedCandidate.name}</h3>

          <p>
            <strong>Tahmini Maliyet:</strong> {formatMoney(selectedCandidate.estimatedCost)}
          </p>
          <p>
            <strong>Maliyet Skoru:</strong> {showScore(selectedCandidate.costScore)}
          </p>
          <p>
            <strong>Talep Skoru:</strong> {showScore(selectedCandidate.demandScore)}
          </p>
          <p>
            <strong>Genel Skor:</strong> {showScore(selectedCandidate.generalScore)}
          </p>

          {selectedCandidate.status === "missing" && <div className="popup-warning">Veri Eksik</div>}

          <button
            className="candidate-ol-popup-save"
            type="button"
            data-testid={`popup-save-candidate-button-${selectedCandidate.id}`}
            onClick={() => onSaveCandidate(selectedCandidate)}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
