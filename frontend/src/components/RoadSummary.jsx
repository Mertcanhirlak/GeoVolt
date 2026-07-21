import React, { useEffect, useMemo, useState } from "react";
import { getRoads } from "../services/roadApi";
import {
  createSpatialBoundary,
  doesGeometryIntersectBoundary,
} from "../utils/geoSpatialFilter";

function getTypeDistribution(roads) {
  const typeMap = new Map();

  roads.forEach((road) => {
    const roadType = road.roadType || "Tip bilgisi yok";
    typeMap.set(roadType, (typeMap.get(roadType) || 0) + 1);
  });

  return Array.from(typeMap.entries())
    .map(([roadType, count]) => ({
      roadType,
      count,
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

  return distribution.length > 0 ? distribution[0] : null;
}

export default function RoadSummary({
  filterBoundaryGeoJson = "",
  filterLabel = "Tümü",
  filterLevel = "all",
  filterLoading = false,
}) {
  const [roads, setRoads] = useState([]);
  const [source, setSource] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRoads() {
      const result = await getRoads();

      if (!isMounted) {
        return;
      }

      setRoads(result.data || []);
      setSource(result.source || "");
    }

    loadRoads();

    return () => {
      isMounted = false;
    };
  }, []);

  const isFilterRequested = filterLevel !== "all";

  const spatialBoundary = useMemo(
    () => createSpatialBoundary(filterBoundaryGeoJson),
    [filterBoundaryGeoJson],
  );

  const visibleRoads = useMemo(() => {
    if (!isFilterRequested) {
      return roads;
    }

    if (filterLoading || !spatialBoundary) {
      return [];
    }

    return roads.filter((road) =>
      doesGeometryIntersectBoundary(road.geometry, spatialBoundary),
    );
  }, [filterLoading, isFilterRequested, roads, spatialBoundary]);

  const typeDistribution = useMemo(
    () => getTypeDistribution(visibleRoads),
    [visibleRoads],
  );

  const averageSpeedLimit = useMemo(
    () => getAverageSpeedLimit(visibleRoads),
    [visibleRoads],
  );

  const averageTrafficSpeed = useMemo(
    () => getAverageTrafficSpeed(visibleRoads),
    [visibleRoads],
  );

  const topRoadType = useMemo(
    () => getTopRoadType(visibleRoads),
    [visibleRoads],
  );

  const boundaryMissing =
    isFilterRequested && !filterLoading && !spatialBoundary;

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

      </div>

      <div className="road-summary-grid">
        <div>
          <span>Toplam Yol Kaydı</span>
          <strong>{filterLoading ? "Yükleniyor..." : visibleRoads.length}</strong>
        </div>

        <div>
          <span>En Yaygın Yol Tipi</span>
          <strong>
            {filterLoading
              ? "Yükleniyor..."
              : topRoadType
                ? `${topRoadType.roadType} (${topRoadType.count})`
                : "Veri Eksik"}
          </strong>
        </div>

        <div>
          <span>Ortalama Hız Limiti</span>
          <strong>{filterLoading ? "Yükleniyor..." : averageSpeedLimit}</strong>
        </div>

        <div>
          <span>Ortalama Trafik Hızı</span>
          <strong>
            {filterLoading ? "Yükleniyor..." : averageTrafficSpeed}
          </strong>
        </div>

        <div>
          <span>Veri Kaynağı</span>
          <strong>{source || "Veri Eksik"}</strong>
        </div>
      </div>

      <div className="road-insight-card" data-testid="road-accessibility-note">
        <strong>
          {boundaryMissing
            ? "Seçilen alanın sınırı bulunamadı."
            : isFilterRequested
              ? `${filterLabel} için erişilebilirlik özeti hazır.`
              : "Erişilebilirlik skoru için hazır."}
        </strong>
        <p>
          {boundaryMissing
            ? "Bölge veya mahalle geometrisi gelmediği için yol verileri yanlış bir toplamla gösterilmedi."
            : isFilterRequested
              ? "Seçilen alanla kesişen yol segmentleri, yol tipi ve hız bilgileri üzerinden özetlendi."
              : "YOL.geojson içinden yol tipi ve hız bilgileri okunuyor. Bir bölge veya mahalle seçildiğinde yalnızca o alanla kesişen yollar hesaplanır."}
        </p>
      </div>

      <div className="road-distribution-section">
        <h3>Yol Tipi Dağılımı</h3>

        <div className="road-type-list">
          {filterLoading ? (
            <p>Seçilen alanın sınırı yükleniyor.</p>
          ) : boundaryMissing ? (
            <p>Seçilen alanın sınır geometrisi bulunamadı.</p>
          ) : typeDistribution.length === 0 ? (
            <p>Seçilen alanda yol kaydı bulunamadı.</p>
          ) : (
            typeDistribution.map((item) => (
              <div
                key={item.roadType}
                className="road-list-row"
                data-testid={`road-type-row-${item.roadType}`}
              >
                <span>{item.roadType}</span>
                <strong>{item.count}</strong>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
