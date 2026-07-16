import React, { useEffect, useMemo, useState } from "react";
import { getTrafos } from "../services/trafoApi";
import {
  createSpatialBoundary,
  isPointInsideBoundary,
} from "../utils/geoSpatialFilter";

function getCategoryDistribution(trafos) {
  const categoryMap = new Map();

  trafos.forEach((trafo) => {
    const category = trafo.category || "Kategori bilgisi yok";
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

function getSubCategoryDistribution(trafos) {
  const subCategoryMap = new Map();

  trafos.forEach((trafo) => {
    const subCategory = trafo.subCategory || "Alt kategori bilgisi yok";
    subCategoryMap.set(subCategory, (subCategoryMap.get(subCategory) || 0) + 1);
  });

  return Array.from(subCategoryMap.entries())
    .map(([subCategory, count]) => ({
      subCategory,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function getTopSubCategory(trafos) {
  const distribution = getSubCategoryDistribution(trafos);

  return distribution.length > 0 ? distribution[0] : null;
}

function createSourceMessage(source, filterLabel, isFilterRequested) {
  let sourceMessage = "";

  if (source === "local-geojson") {
    sourceMessage = "TRAFO.geojson verisi kullanılıyor.";
  } else if (source === "local-mock") {
    sourceMessage = "Yerel trafo deneme verileri kullanılıyor.";
  }

  if (sourceMessage && isFilterRequested && filterLabel) {
    return `${sourceMessage} Seçili alan: ${filterLabel}.`;
  }

  return sourceMessage;
}

export default function TrafoSummary({
  filterBoundaryGeoJson = "",
  filterLabel = "Tümü",
  filterLevel = "all",
  filterLoading = false,
}) {
  const [trafos, setTrafos] = useState([]);
  const [source, setSource] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTrafos() {
      const result = await getTrafos();

      if (!isMounted) {
        return;
      }

      setTrafos(result.data || []);
      setSource(result.source || "");
    }

    loadTrafos();

    return () => {
      isMounted = false;
    };
  }, []);

  const isFilterRequested = filterLevel !== "all";

  const spatialBoundary = useMemo(
    () => createSpatialBoundary(filterBoundaryGeoJson),
    [filterBoundaryGeoJson],
  );

  const visibleTrafos = useMemo(() => {
    if (!isFilterRequested) {
      return trafos;
    }

    if (filterLoading || !spatialBoundary) {
      return [];
    }

    return trafos.filter((trafo) =>
      isPointInsideBoundary(
        trafo.longitude,
        trafo.latitude,
        spatialBoundary,
      ),
    );
  }, [filterLoading, isFilterRequested, spatialBoundary, trafos]);

  const categoryDistribution = useMemo(
    () => getCategoryDistribution(visibleTrafos),
    [visibleTrafos],
  );

  const subCategoryDistribution = useMemo(
    () => getSubCategoryDistribution(visibleTrafos),
    [visibleTrafos],
  );

  const topSubCategory = useMemo(
    () => getTopSubCategory(visibleTrafos),
    [visibleTrafos],
  );

  const message = createSourceMessage(
    source,
    filterLabel,
    isFilterRequested,
  );

  const boundaryMissing =
    isFilterRequested && !filterLoading && !spatialBoundary;

  return (
    <div className="trafo-summary-card" data-testid="trafo-summary-card">
      <div className="trafo-summary-header">
        <div>
          <h2>Trafo Enerji Verisi Özeti</h2>
          <p>
            Trafo verisi, aday noktaların enerji altyapısına yakınlığını ve
            kurulum uygunluğunu değerlendirmek için kullanılabilir.
          </p>
        </div>

        {message && (
          <span className="trafo-source-badge" data-testid="trafo-source-badge">
            {message}
          </span>
        )}
      </div>

      <div className="trafo-summary-grid">
        <div>
          <span>Toplam Trafo</span>
          <strong>
            {filterLoading ? "Yükleniyor..." : visibleTrafos.length}
          </strong>
        </div>

        <div>
          <span>En Yaygın Trafo Tipi</span>
          <strong>
            {filterLoading
              ? "Yükleniyor..."
              : topSubCategory
                ? `${topSubCategory.subCategory} (${topSubCategory.count})`
                : "Veri Eksik"}
          </strong>
        </div>

        <div>
          <span>Veri Kaynağı</span>
          <strong>{source || "Veri Eksik"}</strong>
        </div>
      </div>

      {boundaryMissing ? (
        <div className="poi-data-note">
          <strong>Seçilen alanın sınırı bulunamadı.</strong>
          <p>
            Bölge veya mahalle geometrisi gelmediği için trafo verileri yanlış
            bir toplamla gösterilmedi.
          </p>
        </div>
      ) : (
        <div className="trafo-lists">
          <div>
            <h3>Kategori Dağılımı</h3>

            {filterLoading ? (
              <p>Seçilen alanın sınırı yükleniyor.</p>
            ) : categoryDistribution.length === 0 ? (
              <p>Seçilen alanda trafo bulunamadı.</p>
            ) : (
              categoryDistribution.map((item) => (
                <div
                  key={item.category}
                  className="trafo-list-row"
                  data-testid={`trafo-category-row-${item.category}`}
                >
                  <span>{item.category}</span>
                  <strong>{item.count}</strong>
                </div>
              ))
            )}
          </div>

          <div>
            <h3>Alt Kategori Dağılımı</h3>

            {filterLoading ? (
              <p>Seçilen alanın sınırı yükleniyor.</p>
            ) : subCategoryDistribution.length === 0 ? (
              <p>Seçilen alanda trafo tipi bulunamadı.</p>
            ) : (
              subCategoryDistribution.map((item) => (
                <div
                  key={item.subCategory}
                  className="trafo-list-row"
                  data-testid={`trafo-sub-category-row-${item.subCategory}`}
                >
                  <span>{item.subCategory}</span>
                  <strong>{item.count}</strong>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
