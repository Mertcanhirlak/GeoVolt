import { useEffect, useMemo, useState } from "react";
import { mockChargingStations } from "../data/mockChargingStations";
import { getChargingStationDetail, getChargingStations, getRegions } from "../services/mapDataApi";
import "./ExistingStationsMap.css";

const ANKARA_BOUNDS = {
  minLat: 39.82,
  maxLat: 39.95,
  minLng: 32.78,
  maxLng: 32.89,
};

const regionPlacements = [
  { left: 38, top: 26, width: 22, height: 22 },
  { left: 20, top: 23, width: 21, height: 25 },
  { left: 54, top: 54, width: 24, height: 26 },
  { left: 32, top: 58, width: 18, height: 22 },
  { left: 62, top: 24, width: 20, height: 20 },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getStationPosition(station) {
  if (Number.isFinite(station.x) && Number.isFinite(station.y)) {
    return { x: station.x, y: station.y };
  }

  const lngRatio = (station.longitude - ANKARA_BOUNDS.minLng) / (ANKARA_BOUNDS.maxLng - ANKARA_BOUNDS.minLng);
  const latRatio = (ANKARA_BOUNDS.maxLat - station.latitude) / (ANKARA_BOUNDS.maxLat - ANKARA_BOUNDS.minLat);

  return {
    x: clamp(lngRatio * 100, 8, 92),
    y: clamp(latRatio * 100, 12, 88),
  };
}

function formatConnectors(connectors = []) {
  if (!Array.isArray(connectors) || connectors.length === 0) {
    return null;
  }

  return connectors
    .map((connector) => {
      const quantity = connector.quantity > 1 ? `${connector.quantity}x ` : "";
      return `${quantity}${connector.socketType}`;
    })
    .join(" / ");
}

function formatPower(connectors = []) {
  if (!Array.isArray(connectors) || connectors.length === 0) {
    return null;
  }

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
    ...getStationPosition(station),
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

export default function ExistingStationsMap({ searchTerm = "", regionsActive = false }) {
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [stations, setStations] = useState(mockChargingStations);
  const [regions, setRegions] = useState([]);
  const [source, setSource] = useState("mock");
  const [loadingDetailId, setLoadingDetailId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMapData() {
      try {
        const [stationData, regionData] = await Promise.all([
          getChargingStations(),
          getRegions(),
        ]);

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

  const visibleStations = useMemo(() => {
    return stations.filter((station) => matchesSearch(station, searchTerm));
  }, [searchTerm, stations]);

  const selectedStation =
    visibleStations.find((station) => station.id === selectedStationId) ?? visibleStations[0] ?? null;

  useEffect(() => {
    if (!selectedStation || selectedStationId !== null || source !== "api") return;

    selectStation(selectedStation.id);
  }, [selectedStation, selectedStationId, source]);

  async function selectStation(stationId) {
    setSelectedStationId(stationId);

    if (source !== "api") return;

    setLoadingDetailId(stationId);

    try {
      const detail = await getChargingStationDetail(stationId);
      const regionLookup = new Map(regions.map((region) => [region.id, region.name]));
      const normalizedDetail = normalizeStation(detail, regionLookup);

      setStations((currentStations) =>
        currentStations.map((station) => (station.id === stationId ? normalizedDetail : station))
      );
    } catch {
      // Keep the list data visible if the optional detail request fails.
    } finally {
      setLoadingDetailId(null);
    }
  }

  return (
    <div className="existing-map" data-testid="existing-stations-map">
      <div className="existing-map-grid" />

      {regionsActive && (
        <div className="existing-region-layer" aria-hidden="true">
          {(regions.length > 0 ? regions : [
            { id: 1, name: "Kizilay" },
            { id: 2, name: "Sogutozu" },
            { id: 3, name: "Oran" },
          ]).slice(0, 5).map((region, index) => {
            const placement = regionPlacements[index % regionPlacements.length];

            return (
              <div
                key={region.id ?? region.name}
                className="existing-region"
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

      <div className="existing-road road-main" />
      <div className="existing-road road-secondary" />
      <div className="existing-road road-ring" />
      <div className="existing-water" />

      {visibleStations.map((station) => (
        <button
          key={station.id}
          type="button"
          className={`existing-station-marker ${
            selectedStation?.id === station.id ? "selected" : ""
          } ${station.status !== "Aktif" ? "maintenance" : ""}`}
          style={{ left: `${station.x}%`, top: `${station.y}%` }}
          title={station.name}
          data-testid={`existing-station-marker-${station.id}`}
          onClick={() => selectStation(station.id)}
        >
          <span className="marker-dot" />
        </button>
      ))}

      {selectedStation && (
        <article
          className="existing-station-popup"
          style={{
            left: `${Math.min(selectedStation.x + 3, 74)}%`,
            top: `${Math.max(selectedStation.y - 14, 14)}%`,
          }}
          data-testid="existing-station-popup"
        >
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
        </article>
      )}

      <div className="existing-map-scale" aria-hidden="true">
        <span />
        <span />
      </div>

      <div className="existing-map-source">
        {source === "api" ? "Canli veri" : "Mock veri"}
      </div>
    </div>
  );
}
