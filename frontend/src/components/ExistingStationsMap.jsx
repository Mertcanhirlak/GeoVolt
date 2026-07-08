import { useEffect, useMemo, useRef, useState } from "react";
import Feature from "ol/Feature";
import Map from "ol/Map";
import Overlay from "ol/Overlay";
import View from "ol/View";
import GeoJSON from "ol/format/GeoJSON";
import Point from "ol/geom/Point";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import "ol/ol.css";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Icon, Stroke, Style, Text } from "ol/style";
import { mockChargingStations } from "../data/mockChargingStations";
import { getChargingStationDetail, getChargingStations, getRegions } from "../services/mapDataApi";
import "./ExistingStationsMap.css";

const CANKAYA_CENTER = fromLonLat([32.8541, 39.9208]);

const fallbackRegionPlacements = [
  { left: 34, top: 18, width: 19, height: 22 },
  { left: 18, top: 25, width: 20, height: 24 },
  { left: 48, top: 28, width: 19, height: 25 },
  { left: 31, top: 48, width: 20, height: 25 },
  { left: 58, top: 52, width: 21, height: 24 },
  { left: 66, top: 20, width: 18, height: 21 },
  { left: 12, top: 52, width: 19, height: 25 },
  { left: 43, top: 58, width: 18, height: 24 },
];

const regionColors = [
  "rgba(134, 239, 172, 0.34)",
  "rgba(147, 197, 253, 0.34)",
  "rgba(252, 211, 77, 0.36)",
  "rgba(248, 113, 113, 0.28)",
  "rgba(196, 181, 253, 0.34)",
  "rgba(45, 212, 191, 0.28)",
];

function formatConnectors(connectors = []) {
  if (!Array.isArray(connectors) || connectors.length === 0) return null;

  return connectors
    .map((connector) => {
      const quantity = connector.quantity > 1 ? `${connector.quantity}x ` : "";
      return `${quantity}${connector.socketType}`;
    })
    .join(" + ");
}

function formatPower(connectors = []) {
  if (!Array.isArray(connectors) || connectors.length === 0) return null;

  const maxPower = Math.max(...connectors.map((connector) => Number(connector.powerKw) || 0));
  return maxPower > 0 ? `${maxPower} kW` : null;
}

function normalizeStation(station, regionLookup = new Map()) {
  const status = station.status ?? (station.isActive ? "Aktif" : "Pasif");
  const regionName = station.regionName || regionLookup.get(station.regionId);
  const connectorText = formatConnectors(station.connectors);
  const powerText = formatPower(station.connectors);

  return {
    id: station.id,
    name: station.name || "Sarj Istasyonu",
    district: station.district || "Cankaya",
    neighborhood: station.neighborhood || regionName || `Bolge ${station.regionId ?? ""}`.trim(),
    address: station.address || "Adres bilgisi yok",
    latitude: Number(station.latitude),
    longitude: Number(station.longitude),
    socketType: station.socketType || station.connectorType || connectorText || "Detay icin tiklayin",
    status,
    power: station.power || powerText || station.operatorName || "Operator bilgisi yok",
  };
}

function matchesSearch(station, searchTerm) {
  const normalizedTerm = searchTerm.trim().toLocaleLowerCase("tr-TR");
  if (!normalizedTerm) return true;

  return [station.name, station.neighborhood, station.address, station.socketType]
    .join(" ")
    .toLocaleLowerCase("tr-TR")
    .includes(normalizedTerm);
}

function createPinStyle(station, isSelected) {
  const color = station.status === "Aktif" ? "#ef233c" : "#f59e0b";

  return new Style({
    image: new Icon({
      src:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 34s11-10.6 11-21A11 11 0 1 0 3 13c0 10.4 11 21 11 21z" fill="${isSelected ? "#2563eb" : color}" stroke="white" stroke-width="3"/><circle cx="14" cy="13" r="4.5" fill="white"/></svg>`
        ),
      anchor: [0.5, 1],
      scale: isSelected ? 1.18 : 0.86,
    }),
  });
}

function createRegionStyle(feature) {
  const index = feature.get("regionIndex") ?? 0;

  return new Style({
    fill: new Fill({ color: regionColors[index % regionColors.length] }),
    stroke: new Stroke({ color: "rgba(220, 38, 38, 0.82)", width: 2.5 }),
    text: new Text({
      text: feature.get("name") || "",
      fill: new Fill({ color: "rgba(15, 23, 42, 0.72)" }),
      stroke: new Stroke({ color: "rgba(255, 255, 255, 0.8)", width: 3 }),
      font: "700 12px Arial, sans-serif",
    }),
  });
}

function createStationFeature(station, selectedStationId) {
  const feature = new Feature({
    geometry: new Point(fromLonLat([station.longitude, station.latitude])),
    station,
  });

  feature.setStyle(createPinStyle(station, station.id === selectedStationId));
  return feature;
}

function parseRegionFeatures(regions) {
  const parser = new GeoJSON();

  return regions.flatMap((region, index) => {
    if (!region.boundaryGeoJson) return [];

    try {
      const geoJson = JSON.parse(region.boundaryGeoJson);
      const features = parser.readFeatures(geoJson, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });

      return features.map((feature) => {
        feature.set("name", region.name);
        feature.set("regionIndex", index);
        return feature;
      });
    } catch {
      return [];
    }
  });
}

function getRegionVariant(index) {
  return `variant-${(index % 6) + 1}`;
}

export default function ExistingStationsMap({ searchTerm = "", regionsActive = false }) {
  const mapElementRef = useRef(null);
  const popupElementRef = useRef(null);
  const mapRef = useRef(null);
  const stationSourceRef = useRef(new VectorSource());
  const regionSourceRef = useRef(new VectorSource());
  const popupOverlayRef = useRef(null);

  const [selectedStationId, setSelectedStationId] = useState(null);
  const [stations, setStations] = useState(mockChargingStations);
  const [regions, setRegions] = useState([]);
  const [source, setSource] = useState("mock");
  const [loadingDetailId, setLoadingDetailId] = useState(null);

  const visibleStations = useMemo(() => {
    return stations.filter((station) => matchesSearch(station, searchTerm));
  }, [searchTerm, stations]);

  const selectedStation =
    visibleStations.find((station) => station.id === selectedStationId) ?? visibleStations[0] ?? null;

  useEffect(() => {
    if (!mapElementRef.current || !popupElementRef.current || mapRef.current) return;

    const popupOverlay = new Overlay({
      element: popupElementRef.current,
      positioning: "bottom-left",
      offset: [16, -10],
      stopEvent: true,
    });

    popupOverlayRef.current = popupOverlay;

    const map = new Map({
      target: mapElementRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new VectorLayer({
          source: regionSourceRef.current,
          style: createRegionStyle,
        }),
        new VectorLayer({
          source: stationSourceRef.current,
          zIndex: 5,
        }),
      ],
      overlays: [popupOverlay],
      view: new View({
        center: CANKAYA_CENTER,
        zoom: 12.4,
        minZoom: 11,
        maxZoom: 17,
      }),
      controls: [],
    });

    map.on("singleclick", (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (item) => item);
      const station = feature?.get("station");

      if (station) {
        selectStation(station.id);
      }
    });

    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadMapData() {
      try {
        const [stationData, regionData] = await Promise.all([getChargingStations(), getRegions()]);

        if (!isMounted) return;

        const safeRegions = Array.isArray(regionData) ? regionData : [];
        const regionLookup = new Map(safeRegions.map((region) => [region.id, region.name]));

        setStations(stationData.map((station) => normalizeStation(station, regionLookup)));
        setRegions(safeRegions);
        setSource("api");
      } catch {
        if (!isMounted) return;

        setStations(mockChargingStations);
        setRegions([]);
        setSource("mock");
      }
    }

    loadMapData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    stationSourceRef.current.clear();
    stationSourceRef.current.addFeatures(
      visibleStations.map((station) => createStationFeature(station, selectedStation?.id))
    );

    if (!selectedStation && popupOverlayRef.current) {
      popupOverlayRef.current.setPosition(undefined);
    }
  }, [visibleStations, selectedStation]);

  useEffect(() => {
    regionSourceRef.current.clear();

    if (!regionsActive) return;

    const regionFeatures = parseRegionFeatures(regions);
    regionSourceRef.current.addFeatures(regionFeatures);
  }, [regions, regionsActive]);

  useEffect(() => {
    if (!selectedStation || selectedStationId !== null || source !== "api") return;
    selectStation(selectedStation.id);
  }, [selectedStation, selectedStationId, source]);

  useEffect(() => {
    if (!selectedStation || !popupOverlayRef.current) return;

    popupOverlayRef.current.setPosition(fromLonLat([selectedStation.longitude, selectedStation.latitude]));
  }, [selectedStation]);

  async function selectStation(stationId) {
    setSelectedStationId(stationId);

    const station = stations.find((item) => item.id === stationId);
    if (station && popupOverlayRef.current) {
      popupOverlayRef.current.setPosition(fromLonLat([station.longitude, station.latitude]));
    }

    if (source !== "api") return;

    setLoadingDetailId(stationId);

    try {
      const detail = await getChargingStationDetail(stationId);
      const regionLookup = new Map(regions.map((region) => [region.id, region.name]));
      const normalizedDetail = normalizeStation(detail, regionLookup);

      setStations((currentStations) =>
        currentStations.map((item) => (item.id === stationId ? normalizedDetail : item))
      );
    } catch {
      // Keep the list data visible if the optional detail request fails.
    } finally {
      setLoadingDetailId(null);
    }
  }

  return (
    <div className="existing-map" data-testid="existing-stations-map">
      <div ref={mapElementRef} className="openlayers-map" />

      {regionsActive && regionSourceRef.current.getFeatures().length === 0 && (
        <div className="existing-region-layer fallback-regions" aria-hidden="true">
          {(regions.length > 0 ? regions : [
            { id: 1, name: "Kizilay" },
            { id: 2, name: "Sogutozu" },
            { id: 3, name: "Oran" },
            { id: 4, name: "Balgat" },
            { id: 5, name: "Dikmen" },
            { id: 6, name: "Cukurambar" },
            { id: 7, name: "Bahcelievler" },
            { id: 8, name: "Kavaklidere" },
          ])
            .slice(0, 8)
            .map((region, index) => {
              const placement = fallbackRegionPlacements[index % fallbackRegionPlacements.length];

              return (
                <div
                  key={region.id ?? region.name}
                  className={`existing-region ${getRegionVariant(index)}`}
                  style={{
                    left: `${placement.left}%`,
                    top: `${placement.top}%`,
                    width: `${placement.width}%`,
                    height: `${placement.height}%`,
                  }}
                >
                  {region.name}
                </div>
              );
            })}
        </div>
      )}

      {regionsActive && (
        <div className="selection-overlay" aria-hidden="true">
          <div className="selection-line" />
          <div className="selection-box">
            <span>Seçili Alan</span>
            <strong>67 x 18</strong>
          </div>
        </div>
      )}

      <div ref={popupElementRef} className="existing-station-popup" data-testid="existing-station-popup">
        {selectedStation && (
          <>
            <div>
              <span>{selectedStation.neighborhood}</span>
              <strong>{selectedStation.status}</strong>
            </div>

            <h2>{selectedStation.name}</h2>
            <p>{selectedStation.address}</p>

            <dl>
              <div>
                <dt>Soket</dt>
                <dd>
                  {loadingDetailId === selectedStation.id ? "Yukleniyor..." : selectedStation.socketType}
                </dd>
              </div>
              <div>
                <dt>Guc</dt>
                <dd>{selectedStation.power}</dd>
              </div>
            </dl>
          </>
        )}
      </div>

      <div className="existing-map-source">{source === "api" ? "Canli veri" : "Mock veri"}</div>
    </div>
  );
}
