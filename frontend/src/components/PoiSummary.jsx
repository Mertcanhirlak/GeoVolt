import React, { useEffect, useMemo, useState } from "react";
import { getPois } from "../services/poiApi";

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
        count
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
      count
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
      count
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

export default function PoiSummary() {
  const [pois, setPois] = useState([]);
  const [source, setSource] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPois() {
      const result = await getPois();

      if (!isMounted) {
        return;
      }

      setPois(result.data || []);
      setSource(result.source);

      if (result.source === "local-geojson") {
        setMessage("POI.geojson verisi kullanılıyor.");
        return;
      }

      if (result.source === "local-mock") {
        setMessage("POI mock verisi kullanılıyor.");
        return;
      }

      setMessage("");
    }

    loadPois();

    return () => {
      isMounted = false;
    };
  }, []);

  const topCategory = useMemo(() => getTopCategory(pois), [pois]);

  const categoryDistribution = useMemo(
    () => getCategoryDistribution(pois),
    [pois]
  );

  const regionDistribution = useMemo(
    () => getRegionDistribution(pois),
    [pois]
  );

  const showRegionDistribution = hasUsefulRegionData(regionDistribution);

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

        {message && (
          <span className="poi-source-badge" data-testid="poi-source-badge">
            {message}
          </span>
        )}
      </div>

      <div className="poi-summary-grid">
        <div>
          <span>Toplam POI</span>
          <strong>{pois.length}</strong>
        </div>

        <div>
          <span>En Yoğun Kategori</span>
          <strong>
            {topCategory
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

          {categoryDistribution.length === 0 ? (
            <p className="poi-empty">Kategori verisi bulunamadı.</p>
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

          {showRegionDistribution ? (
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
                POI.geojson dosyasında kategori bilgileri okunuyor; ancak bölge
                veya mahalle alanı bulunamadığı için bölgesel dağılım
                hesaplanamıyor.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}