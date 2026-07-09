import React, { useEffect, useMemo, useState } from "react";
import { getTrafos } from "../services/trafoApi";

function getCategoryDistribution(trafos) {
  const categoryMap = new Map();

  trafos.forEach((trafo) => {
    const category = trafo.category || "Kategori bilgisi yok";
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
  });

  return Array.from(categoryMap.entries())
    .map(([category, count]) => ({
      category,
      count
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
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function getTopSubCategory(trafos) {
  const distribution = getSubCategoryDistribution(trafos);

  if (distribution.length === 0) {
    return null;
  }

  return distribution[0];
}

export default function TrafoSummary() {
  const [trafos, setTrafos] = useState([]);
  const [source, setSource] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTrafos() {
      const result = await getTrafos();

      if (!isMounted) {
        return;
      }

      setTrafos(result.data || []);
      setSource(result.source);

      if (result.source === "local-geojson") {
        setMessage("TRAFO.geojson verisi kullanılıyor.");
        return;
      }

      if (result.source === "local-mock") {
        setMessage("Trafo mock verisi kullanılıyor.");
        return;
      }

      setMessage("");
    }

    loadTrafos();

    return () => {
      isMounted = false;
    };
  }, []);

  const categoryDistribution = useMemo(
    () => getCategoryDistribution(trafos),
    [trafos]
  );

  const subCategoryDistribution = useMemo(
    () => getSubCategoryDistribution(trafos),
    [trafos]
  );

  const topSubCategory = useMemo(() => getTopSubCategory(trafos), [trafos]);

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
          <strong>{trafos.length}</strong>
        </div>

        <div>
          <span>En Yaygın Trafo Tipi</span>
          <strong>
            {topSubCategory
              ? `${topSubCategory.subCategory} (${topSubCategory.count})`
              : "Veri Eksik"}
          </strong>
        </div>

        <div>
          <span>Veri Kaynağı</span>
          <strong>{source || "Veri Eksik"}</strong>
        </div>
      </div>

      <div className="trafo-lists">
        <div>
          <h3>Kategori Dağılımı</h3>

          {categoryDistribution.map((item) => (
            <div
              key={item.category}
              className="trafo-list-row"
              data-testid={`trafo-category-row-${item.category}`}
            >
              <span>{item.category}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>

        <div>
          <h3>Alt Kategori Dağılımı</h3>

          {subCategoryDistribution.map((item) => (
            <div
              key={item.subCategory}
              className="trafo-list-row"
              data-testid={`trafo-sub-category-row-${item.subCategory}`}
            >
              <span>{item.subCategory}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}