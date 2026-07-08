import { useMemo, useState } from "react";
import { mockChargingStations } from "../data/mockChargingStations";
import "./ExistingStationsMap.css";

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

  const visibleStations = useMemo(() => {
    return mockChargingStations.filter((station) => matchesSearch(station, searchTerm));
  }, [searchTerm]);

  const selectedStation =
    visibleStations.find((station) => station.id === selectedStationId) ?? visibleStations[0] ?? null;

  return (
    <div className="existing-map" data-testid="existing-stations-map">
      <div className="existing-map-grid" />

      {regionsActive && (
        <div className="existing-region-layer" aria-hidden="true">
          <div className="existing-region region-kizilay">Kizilay</div>
          <div className="existing-region region-sogutozu">Sogutozu</div>
          <div className="existing-region region-oran">Oran</div>
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
          } ${station.status === "Bakimda" ? "maintenance" : ""}`}
          style={{ left: `${station.x}%`, top: `${station.y}%` }}
          title={station.name}
          data-testid={`existing-station-marker-${station.id}`}
          onClick={() => setSelectedStationId(station.id)}
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
              <dd>{selectedStation.socketType}</dd>
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
    </div>
  );
}
