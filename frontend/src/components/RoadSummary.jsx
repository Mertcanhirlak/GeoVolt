import React, { useEffect, useMemo, useState } from "react";
import { getRoads } from "../services/roadApi";

function getTypeDistribution(roads) {
  const typeMap = new Map();

  roads.forEach((road) => {
    const roadType = road.roadType || "Tip bilgisi yok";
    typeMap.set(roadType, (typeMap.get(roadType) || 0) + 1);
  });

  return Array.from(typeMap.entries())
    .map(([roadType, count]) => ({
      roadType,
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function getAverageSpeedLimit(roads) {
  const speedValues = roads
    .map((road) => Number(road.speedLimit))
    .filter((value) => !Number.isNaN(value) && value > 0);

  if (speedValues.length === 0) {
    return "Veri Eksik";
  }

  const total = speedValues.reduce((sum, value) => sum + value, 0);
  return `${Math.round(total / speedValues.length)} km/s`;
}

function getAverageTrafficSpeed(roads) {
  const speedValues = roads
    .map((road) => Number(road.averageSpeed))
    .filter((value) => !Number.isNaN(value) && value > 0);

  if (speedValues.length === 0) {
    return "Veri Eksik";
  }

  const total = speedValues.reduce((sum, value) => sum + value, 0);
  return `${Math.round(total / speedValues.length)} km/s`;
}

function getTopRoadType(roads) {
  const distribution = getTypeDistribution(roads);

  if (distribution.length === 0) {
    return null;
  }

  return distribution[0];
}

export default function RoadSummary() {
  const [roads, setRoads] = useState([]);
  const [source, setSource] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRoads() {
      const result = await getRoads();

      if (!isMounted) {
        return;
      }

      setRoads(result.data || []);
      setSource(result.source);

      if (result.source === "local-geojson") {
        setMessage("YOL.geojson verisi kullanılıyor.");
        return;
      }

      if (result.source === "local-mock") {
        setMessage("Yerel yol deneme verileri kullanılıyor.");
        return;
      }

      setMessage("");
    }

    loadRoads();

    return () => {
      isMounted = false;
    };
  }, []);

  const typeDistribution = useMemo(() => getTypeDistribution(roads), [roads]);
  const averageSpeedLimit = useMemo(() => getAverageSpeedLimit(roads), [roads]);
  const averageTrafficSpeed = useMemo(
    () => getAverageTrafficSpeed(roads),
    [roads]
  );
  const topRoadType = useMemo(() => getTopRoadType(roads), [roads]);

  return (
    <div className="road-summary-card" data-testid="road-summary-card">
      <div className="road-summary-header">
        <div>
          <h2>Yol Erişilebilirlik Verisi Özeti</h2>
          <p>
            Yol verisi; aday noktaların ana yol, cadde ve ulaşım ağına
            yakınlığını değerlendirmek için kullanılabilir.
          </p>
        </div>

        {message && (
          <span className="road-source-badge" data-testid="road-source-badge">
            {message}
          </span>
        )}
      </div>

      <div className="road-summary-grid">
        <div>
          <span>Toplam Yol Kaydı</span>
          <strong>{roads.length}</strong>
        </div>

        <div>
          <span>En Yaygın Yol Tipi</span>
          <strong>
            {topRoadType
              ? `${topRoadType.roadType} (${topRoadType.count})`
              : "Veri Eksik"}
          </strong>
        </div>

        <div>
          <span>Ortalama Hız Limiti</span>
          <strong>{averageSpeedLimit}</strong>
        </div>

        <div>
          <span>Ortalama Trafik Hızı</span>
          <strong>{averageTrafficSpeed}</strong>
        </div>

        <div>
          <span>Veri Kaynağı</span>
          <strong>{source || "Veri Eksik"}</strong>
        </div>
      </div>

      <div className="road-insight-card" data-testid="road-accessibility-note">
        <strong>Erişilebilirlik skoru için hazır.</strong>
        <p>
          YOL.geojson içinden yol tipi ve hız bilgileri okunuyor. Bu veriler
          ileride aday noktanın ana yol/cadde yakınlığı ve ulaşım kolaylığı
          skoruna bağlanabilir.
        </p>
      </div>

      <div className="road-distribution-section">
        <h3>Yol Tipi Dağılımı</h3>

        <div className="road-type-list">
          {typeDistribution.map((item) => (
            <div
              key={item.roadType}
              className="road-list-row"
              data-testid={`road-type-row-${item.roadType}`}
            >
              <span>{item.roadType}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
