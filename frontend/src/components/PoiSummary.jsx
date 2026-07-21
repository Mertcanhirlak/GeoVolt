import React, { useEffect, useMemo, useState } from "react";
import { getPois } from "../services/poiApi";
import {
  createSpatialBoundary,
  isPointInsideBoundary,
} from "../utils/geoSpatialFilter";

function getTopCategory(pois) {
  const categoryMap = new Map();

  pois.forEach((poi) => {
    const category = poi.category || "Kategori bilgisi yok";
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
  });

  let topCategory = null;

  categoryMap.forEach((count, category) => {
    if (!topCategory || count > topCategory.count) {
      topCategory = {
        category,
        count,
      };
    }
  });

  return topCategory;
}

function getCategoryDistribution(pois) {
  const categoryMap = new Map();

  pois.forEach((poi) => {
    const category = poi.category || "Kategori bilgisi yok";
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
  });

  return Array.from(categoryMap.entries())
    .map(([category, count]) => ({
      category,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function getRegionDistribution(pois) {
  const regionMap = new Map();

  pois.forEach((poi) => {
    const region = poi.region || "Bölge bilgisi yok";
    regionMap.set(region, (regionMap.get(region) || 0) + 1);
  });

  return Array.from(regionMap.entries())
    .map(([region, count]) => ({
      region,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function hasUsefulRegionData(regionDistribution) {
  if (regionDistribution.length === 0) {
    return false;
  }

  return !(
    regionDistribution.length === 1 &&
    regionDistribution[0].region === "Bölge bilgisi yok"
  );
}

export default function PoiSummary({
  filterBoundaryGeoJson = "",
  filterLabel = "Tümü",
  filterLevel = "all",
  filterLoading = false,
}) {
  const [pois, setPois] = useState([]);
  const [source, setSource] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPois() {
      const result = await getPois();

      if (!isMounted) {
        return;
      }

      setPois(result.data || []);
      setSource(result.source || "");
    }

    loadPois();

    return () => {
      isMounted = false;
    };
  }, []);

  const isFilterRequested = filterLevel !== "all";

  const spatialBoundary = useMemo(
    () => createSpatialBoundary(filterBoundaryGeoJson),
    [filterBoundaryGeoJson],
  );

  const visiblePois = useMemo(() => {
    if (!isFilterRequested) {
      return pois;
    }

    if (filterLoading || !spatialBoundary) {
      return [];
    }

    return pois.filter((poi) =>
      isPointInsideBoundary(
        poi.longitude,
        poi.latitude,
        spatialBoundary,
      ),
    );
  }, [filterLoading, isFilterRequested, pois, spatialBoundary]);

  const topCategory = useMemo(
    () => getTopCategory(visiblePois),
    [visiblePois],
  );

  const categoryDistribution = useMemo(
    () => getCategoryDistribution(visiblePois),
    [visiblePois],
  );

  const regionDistribution = useMemo(() => {
    if (isFilterRequested && spatialBoundary && filterLabel) {
      return [
        {
          region: filterLabel,
          count: visiblePois.length,
        },
      ];
    }

    return getRegionDistribution(visiblePois);
  }, [filterLabel, isFilterRequested, spatialBoundary, visiblePois]);

  const showRegionDistribution =
    isFilterRequested && spatialBoundary
      ? true
      : hasUsefulRegionData(regionDistribution);

  const boundaryMissing =
    isFilterRequested && !filterLoading && !spatialBoundary;

  return (
    <div className="poi-summary-card" data-testid="poi-summary-card">
      <div className="poi-summary-header">
        <div>
          <h2>POI Talep Verisi Özeti</h2>
          <p>
            POI yoğunluğu; AVM, restoran, okul, hastane ve iş merkezi gibi
            noktalar üzerinden aday nokta talep skoruna yardımcı olur.
          </p>
        </div>

      </div>

      <div className="poi-summary-grid">
        <div>
          <span>Toplam POI</span>
          <strong>{filterLoading ? "Yükleniyor..." : visiblePois.length}</strong>
        </div>

        <div>
          <span>En Yoğun Kategori</span>
          <strong>
            {filterLoading
              ? "Yükleniyor..."
              : topCategory
                ? `${topCategory.category} (${topCategory.count})`
                : "Veri Eksik"}
          </strong>
        </div>

        <div>
          <span>Veri Kaynağı</span>
          <strong>{source || "Veri Eksik"}</strong>
        </div>
      </div>

      <div className="poi-lists">
        <div>
          <h3>Kategori Dağılımı</h3>

          {filterLoading ? (
            <p className="poi-empty">Seçilen alanın sınırı yükleniyor.</p>
          ) : boundaryMissing ? (
            <div className="poi-data-note">
              <strong>Seçilen alanın sınırı bulunamadı.</strong>
              <p>
                Bölge veya mahalle geometrisi gelmediği için POI verileri yanlış
                bir toplamla gösterilmedi.
              </p>
            </div>
          ) : categoryDistribution.length === 0 ? (
            <p className="poi-empty">Seçilen alanda POI bulunamadı.</p>
          ) : (
            categoryDistribution.map((item) => (
              <div
                key={item.category}
                className="poi-list-row"
                data-testid={`poi-category-row-${item.category}`}
              >
                <span>{item.category}</span>
                <strong>{item.count}</strong>
              </div>
            ))
          )}
        </div>

        <div>
          <h3>Bölge Dağılımı</h3>

          {filterLoading ? (
            <p className="poi-empty">Seçilen alanın sınırı yükleniyor.</p>
          ) : boundaryMissing ? (
            <div className="poi-data-note" data-testid="poi-region-note">
              <strong>Seçilen alanın sınırı bulunamadı.</strong>
              <p>
                Bölge veya mahalle geometrisi olmadan mekânsal dağılım
                hesaplanamaz.
              </p>
            </div>
          ) : showRegionDistribution ? (
            regionDistribution.map((item) => (
              <div
                key={item.region}
                className="poi-list-row"
                data-testid={`poi-region-row-${item.region}`}
              >
                <span>{item.region}</span>
                <strong>{item.count}</strong>
              </div>
            ))
          ) : (
            <div className="poi-data-note" data-testid="poi-region-note">
              <strong>Bölge bilgisi bulunamadı.</strong>
              <p>
                Genel görünümde POI.geojson içinde bölge veya mahalle alanı
                bulunmadığından dağılım hesaplanamıyor. Bir bölge ya da mahalle
                seçildiğinde koordinatlar sınır poligonu ile eşleştirilir.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
