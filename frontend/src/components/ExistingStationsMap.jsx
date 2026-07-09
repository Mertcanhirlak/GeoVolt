import React, { useEffect, useMemo, useState } from "react";
import { getChargingStations } from "../services/mapDataApi";

function getMapPosition(latitude, longitude, index) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return {
      top: `${30 + (index % 4) * 8}%`,
      left: `${28 + (index % 5) * 10}%`
    };
  }

  const minLat = 39.80;
  const maxLat = 40.05;
  const minLon = 32.55;
  const maxLon = 32.95;

  const left = ((lon - minLon) / (maxLon - minLon)) * 100;
  const top = 100 - ((lat - minLat) / (maxLat - minLat)) * 100;

  return {
    top: `${Math.min(Math.max(top, 12), 82)}%`,
    left: `${Math.min(Math.max(left, 12), 88)}%`
  };
}

export default function ExistingStationsMap({ searchTerm = "", regionsActive = false }) {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadStations() {
      const result = await getChargingStations();

      if (!isMounted) {
        return;
      }

      setStations(result.data || []);
      setSelectedStation(null);

      if (result.source === "local-mock") {
        setMessage("Mock veri kullanılıyor");
        return;
      }

      setMessage("");
    }

    loadStations();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredStations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("tr-TR");

    if (normalizedSearch === "") {
      return stations;
    }

    return stations.filter((station) => {
      const name = station.name?.toLocaleLowerCase("tr-TR") || "";
      const address = station.address?.toLocaleLowerCase("tr-TR") || "";
      const region = station.region?.toLocaleLowerCase("tr-TR") || "";
      const neighborhood = station.neighborhood?.toLocaleLowerCase("tr-TR") || "";
      const companyName = station.companyName?.toLocaleLowerCase("tr-TR") || "";

      return (
        name.includes(normalizedSearch) ||
        address.includes(normalizedSearch) ||
        region.includes(normalizedSearch) ||
        neighborhood.includes(normalizedSearch) ||
        companyName.includes(normalizedSearch)
      );
    });
  }, [stations, searchTerm]);

  return (
    <div className="existing-stations-map" data-testid="existing-stations-map">
      <div className="station-map-header">
        <div>
          <h1>Mevcut Şarj İstasyonları</h1>
          <p>
            İstasyon adı, firma, bölge veya mahalleye göre arama yapılabilir.
          </p>
        </div>

        <div className="station-map-badges">
          {regionsActive && (
            <span className="station-map-badge active" data-testid="region-layer-info">
              Bölge katmanı aktif
            </span>
          )}

          {message && (
            <span className="station-map-badge warning" data-testid="station-map-message">
              {message}
            </span>
          )}
        </div>
      </div>

      {filteredStations.length === 0 && (
        <div className="station-empty-card" data-testid="station-empty-message">
          Aramaya uygun mevcut istasyon bulunamadı.
        </div>
      )}

      {filteredStations.map((station, index) => {
        const position = getMapPosition(station.latitude, station.longitude, index);

        return (
          <button
            key={station.id || index}
            className={`station-map-pin ${
              selectedStation?.id === station.id ? "selected" : ""
            }`}
            style={position}
            data-testid={`station-map-pin-${station.id || index}`}
            title={station.name}
            onClick={() => setSelectedStation(station)}
          >
            ⚡
          </button>
        );
      })}

      {selectedStation && (
        <div
          className="station-detail-card"
          data-testid={`station-popup-${selectedStation.id}`}
        >
          <button
            className="station-detail-close"
            data-testid="station-popup-close-button"
            onClick={() => setSelectedStation(null)}
          >
            ×
          </button>

          <div className="station-detail-title">
            <span className="station-detail-icon">⚡</span>
            <div>
              <h3>{selectedStation.name || "İstasyon Bilgisi"}</h3>
              <p>
                {selectedStation.companyName ||
                  selectedStation.company ||
                  "Firma bilgisi yok"}
              </p>
            </div>
          </div>

          <div className="station-detail-grid">
            <div>
              <span>Adres</span>
              <strong>
                {selectedStation.address ||
                  selectedStation.estimatedAddress ||
                  "Veri Eksik"}
              </strong>
            </div>

            <div>
              <span>Bölge</span>
              <strong>{selectedStation.region || "Veri Eksik"}</strong>
            </div>

            <div>
              <span>Mahalle</span>
              <strong>{selectedStation.neighborhood || "Veri Eksik"}</strong>
            </div>

            <div>
              <span>Soket Tipi</span>
              <strong>
                {selectedStation.socketType ||
                  selectedStation.connectorType ||
                  "Veri Eksik"}
              </strong>
            </div>

            <div>
              <span>Güç</span>
              <strong>
                {selectedStation.powerKw
                  ? `${selectedStation.powerKw} kW`
                  : "Veri Eksik"}
              </strong>
            </div>

            <div>
              <span>Koordinat</span>
              <strong>
                {selectedStation.latitude && selectedStation.longitude
                  ? `${selectedStation.latitude}, ${selectedStation.longitude}`
                  : "Veri Eksik"}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}