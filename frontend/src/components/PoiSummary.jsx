import React, { useEffect, useMemo, useState } from "react";
import { getPois } from "../services/poiApi";
import {
  createSpatialBoundary,
  isPointInsideBoundary,
} from "../utils/geoSpatialFilter";

const LOCAL_NEIGHBORHOOD_URL = "/data/MAHALLE.geojson";
const SPATIAL_INDEX_CELL_SIZE = 0.02;
const REGION_DISTRIBUTION_LIMIT = 8;
const PROCESSING_CHUNK_SIZE = 1500;

let neighborhoodSpatialIndexPromise = null;
const generalRegionDistributionCache = new Map();

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
    .slice(0, REGION_DISTRIBUTION_LIMIT);
}

function createSourceMessage(source, filterLabel, isFilterRequested) {
  let sourceMessage = "";

  if (source === "local-geojson") {
    sourceMessage = "POI.geojson verisi kullanılıyor.";
  } else if (source === "local-mock") {
    sourceMessage = "Yerel POI deneme verileri kullanılıyor.";
  }

  if (sourceMessage && isFilterRequested && filterLabel) {
    return `${sourceMessage} Seçili alan: ${filterLabel}.`;
  }

  return sourceMessage;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function getNeighborhoodName(feature, index) {
  const properties = feature?.properties || {};

  return (
    normalizeText(
      properties.NAME ??
        properties.name ??
        properties.MAHALLE ??
        properties.mahalle ??
        properties.ADI ??
        properties.adi,
    ) || `Bölge ${index + 1}`
  );
}

function getGeometryCoordinates(geometry) {
  if (!geometry || !Array.isArray(geometry.coordinates)) {
    return [];
  }

  if (geometry.type === "Polygon") {
    return [geometry.coordinates];
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates;
  }

  return [];
}

function getGeometryBounds(polygons) {
  let minLongitude = Number.POSITIVE_INFINITY;
  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;

  polygons.forEach((polygon) => {
    polygon.forEach((ring) => {
      ring.forEach((coordinate) => {
        const longitude = Number(coordinate?.[0]);
        const latitude = Number(coordinate?.[1]);

        if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
          return;
        }

        minLongitude = Math.min(minLongitude, longitude);
        minLatitude = Math.min(minLatitude, latitude);
        maxLongitude = Math.max(maxLongitude, longitude);
        maxLatitude = Math.max(maxLatitude, latitude);
      });
    });
  });

  if (
    !Number.isFinite(minLongitude) ||
    !Number.isFinite(minLatitude) ||
    !Number.isFinite(maxLongitude) ||
    !Number.isFinite(maxLatitude)
  ) {
    return null;
  }

  return {
    minLongitude,
    minLatitude,
    maxLongitude,
    maxLatitude,
  };
}

function isPointOnSegment(
  longitude,
  latitude,
  startLongitude,
  startLatitude,
  endLongitude,
  endLatitude,
) {
  const crossProduct =
    (latitude - startLatitude) * (endLongitude - startLongitude) -
    (longitude - startLongitude) * (endLatitude - startLatitude);

  if (Math.abs(crossProduct) > 1e-10) {
    return false;
  }

  const dotProduct =
    (longitude - startLongitude) * (endLongitude - startLongitude) +
    (latitude - startLatitude) * (endLatitude - startLatitude);

  if (dotProduct < 0) {
    return false;
  }

  const squaredLength =
    (endLongitude - startLongitude) ** 2 +
    (endLatitude - startLatitude) ** 2;

  return dotProduct <= squaredLength;
}

function isPointInsideRing(longitude, latitude, ring) {
  if (!Array.isArray(ring) || ring.length < 3) {
    return false;
  }

  let inside = false;

  for (let currentIndex = 0, previousIndex = ring.length - 1;
    currentIndex < ring.length;
    previousIndex = currentIndex, currentIndex += 1) {
    const currentLongitude = Number(ring[currentIndex]?.[0]);
    const currentLatitude = Number(ring[currentIndex]?.[1]);
    const previousLongitude = Number(ring[previousIndex]?.[0]);
    const previousLatitude = Number(ring[previousIndex]?.[1]);

    if (
      !Number.isFinite(currentLongitude) ||
      !Number.isFinite(currentLatitude) ||
      !Number.isFinite(previousLongitude) ||
      !Number.isFinite(previousLatitude)
    ) {
      continue;
    }

    if (
      isPointOnSegment(
        longitude,
        latitude,
        previousLongitude,
        previousLatitude,
        currentLongitude,
        currentLatitude,
      )
    ) {
      return true;
    }

    const crossesLatitude =
      currentLatitude > latitude !== previousLatitude > latitude;

    if (!crossesLatitude) {
      continue;
    }

    const intersectionLongitude =
      ((previousLongitude - currentLongitude) *
        (latitude - currentLatitude)) /
        (previousLatitude - currentLatitude) +
      currentLongitude;

    if (longitude < intersectionLongitude) {
      inside = !inside;
    }
  }

  return inside;
}

function isPointInsidePolygon(longitude, latitude, polygon) {
  if (!Array.isArray(polygon) || polygon.length === 0) {
    return false;
  }

  if (!isPointInsideRing(longitude, latitude, polygon[0])) {
    return false;
  }

  for (let holeIndex = 1; holeIndex < polygon.length; holeIndex += 1) {
    if (isPointInsideRing(longitude, latitude, polygon[holeIndex])) {
      return false;
    }
  }

  return true;
}

function isPointInsideGeometry(longitude, latitude, polygons) {
  return polygons.some((polygon) =>
    isPointInsidePolygon(longitude, latitude, polygon),
  );
}

function isPointInsideBounds(longitude, latitude, bounds) {
  return (
    longitude >= bounds.minLongitude &&
    longitude <= bounds.maxLongitude &&
    latitude >= bounds.minLatitude &&
    latitude <= bounds.maxLatitude
  );
}

function getGridCoordinate(value) {
  return Math.floor(value / SPATIAL_INDEX_CELL_SIZE);
}

function getGridKey(longitudeIndex, latitudeIndex) {
  return `${longitudeIndex}:${latitudeIndex}`;
}

function buildNeighborhoodSpatialIndex(features) {
  const neighborhoods = features
    .map((feature, index) => {
      const polygons = getGeometryCoordinates(feature?.geometry);
      const bounds = getGeometryBounds(polygons);

      if (!bounds || polygons.length === 0) {
        return null;
      }

      return {
        name: getNeighborhoodName(feature, index),
        polygons,
        bounds,
      };
    })
    .filter(Boolean);

  const grid = new Map();

  neighborhoods.forEach((neighborhood, neighborhoodIndex) => {
    const minimumLongitudeIndex = getGridCoordinate(
      neighborhood.bounds.minLongitude,
    );
    const maximumLongitudeIndex = getGridCoordinate(
      neighborhood.bounds.maxLongitude,
    );
    const minimumLatitudeIndex = getGridCoordinate(
      neighborhood.bounds.minLatitude,
    );
    const maximumLatitudeIndex = getGridCoordinate(
      neighborhood.bounds.maxLatitude,
    );

    for (
      let longitudeIndex = minimumLongitudeIndex;
      longitudeIndex <= maximumLongitudeIndex;
      longitudeIndex += 1
    ) {
      for (
        let latitudeIndex = minimumLatitudeIndex;
        latitudeIndex <= maximumLatitudeIndex;
        latitudeIndex += 1
      ) {
        const key = getGridKey(longitudeIndex, latitudeIndex);
        const candidates = grid.get(key) || [];
        candidates.push(neighborhoodIndex);
        grid.set(key, candidates);
      }
    }
  });

  return {
    neighborhoods,
    grid,
  };
}

async function loadNeighborhoodSpatialIndex() {
  if (!neighborhoodSpatialIndexPromise) {
    neighborhoodSpatialIndexPromise = fetch(LOCAL_NEIGHBORHOOD_URL, {
      cache: "force-cache",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("MAHALLE.geojson yüklenemedi.");
        }

        return response.json();
      })
      .then((geoJson) =>
        buildNeighborhoodSpatialIndex(
          Array.isArray(geoJson?.features) ? geoJson.features : [],
        ),
      )
      .catch((error) => {
        neighborhoodSpatialIndexPromise = null;
        throw error;
      });
  }

  return neighborhoodSpatialIndexPromise;
}

function waitForBrowserFrame() {
  return new Promise((resolve) => {
    if (
      typeof window !== "undefined" &&
      typeof window.requestAnimationFrame === "function"
    ) {
      window.requestAnimationFrame(() => resolve());
      return;
    }

    setTimeout(resolve, 0);
  });
}

async function calculateSpatialRegionDistribution(pois) {
  const spatialIndex = await loadNeighborhoodSpatialIndex();
  const regionCounts = new Map();
  let matchedCount = 0;

  for (let startIndex = 0; startIndex < pois.length; startIndex += PROCESSING_CHUNK_SIZE) {
    const endIndex = Math.min(
      startIndex + PROCESSING_CHUNK_SIZE,
      pois.length,
    );

    for (let poiIndex = startIndex; poiIndex < endIndex; poiIndex += 1) {
      const poi = pois[poiIndex];
      const longitude = Number(poi?.longitude);
      const latitude = Number(poi?.latitude);

      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
        continue;
      }

      const key = getGridKey(
        getGridCoordinate(longitude),
        getGridCoordinate(latitude),
      );
      const candidateIndexes = spatialIndex.grid.get(key) || [];

      for (const candidateIndex of candidateIndexes) {
        const neighborhood = spatialIndex.neighborhoods[candidateIndex];

        if (
          !isPointInsideBounds(longitude, latitude, neighborhood.bounds) ||
          !isPointInsideGeometry(
            longitude,
            latitude,
            neighborhood.polygons,
          )
        ) {
          continue;
        }

        regionCounts.set(
          neighborhood.name,
          (regionCounts.get(neighborhood.name) || 0) + 1,
        );
        matchedCount += 1;
        break;
      }
    }

    if (endIndex < pois.length) {
      await waitForBrowserFrame();
    }
  }

  const items = Array.from(regionCounts.entries())
    .map(([region, count]) => ({
      region,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, REGION_DISTRIBUTION_LIMIT);

  return {
    items,
    matchedCount,
    unmatchedCount: Math.max(0, pois.length - matchedCount),
  };
}

function getGeneralRegionDistribution(pois, source) {
  const cacheKey = `${source || "unknown"}:${pois.length}`;

  if (!generalRegionDistributionCache.has(cacheKey)) {
    generalRegionDistributionCache.set(
      cacheKey,
      calculateSpatialRegionDistribution(pois).catch((error) => {
        generalRegionDistributionCache.delete(cacheKey);
        throw error;
      }),
    );
  }

  return generalRegionDistributionCache.get(cacheKey);
}

export default function PoiSummary({
  filterBoundaryGeoJson = "",
  filterLabel = "Tümü",
  filterLevel = "all",
  filterLoading = false,
}) {
  const [pois, setPois] = useState([]);
  const [source, setSource] = useState("");
  const [generalRegionState, setGeneralRegionState] = useState({
    status: "idle",
    items: [],
    matchedCount: 0,
    unmatchedCount: 0,
    error: "",
  });

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

  useEffect(() => {
    if (isFilterRequested || pois.length === 0) {
      return undefined;
    }

    let isCancelled = false;

    setGeneralRegionState((currentState) => ({
      ...currentState,
      status: "loading",
      error: "",
    }));

    getGeneralRegionDistribution(pois, source)
      .then((result) => {
        if (isCancelled) {
          return;
        }

        setGeneralRegionState({
          status: "success",
          items: result.items,
          matchedCount: result.matchedCount,
          unmatchedCount: result.unmatchedCount,
          error: "",
        });
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setGeneralRegionState({
          status: "error",
          items: [],
          matchedCount: 0,
          unmatchedCount: pois.length,
          error:
            error instanceof Error
              ? error.message
              : "Bölge dağılımı hesaplanamadı.",
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [isFilterRequested, pois, source]);

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

    return generalRegionState.items;
  }, [
    filterLabel,
    generalRegionState.items,
    isFilterRequested,
    spatialBoundary,
    visiblePois.length,
  ]);

  const message = createSourceMessage(
    source,
    filterLabel,
    isFilterRequested,
  );

  const boundaryMissing =
    isFilterRequested && !filterLoading && !spatialBoundary;

  const generalRegionLoading =
    !isFilterRequested && generalRegionState.status === "loading";
  const generalRegionError =
    !isFilterRequested && generalRegionState.status === "error";

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
          ) : generalRegionLoading ? (
            <p className="poi-empty" data-testid="poi-region-loading">
              POI koordinatları gerçek mahalle sınırlarıyla eşleştiriliyor...
            </p>
          ) : generalRegionError ? (
            <div className="poi-data-note" data-testid="poi-region-note">
              <strong>Bölge dağılımı hesaplanamadı.</strong>
              <p>{generalRegionState.error}</p>
            </div>
          ) : regionDistribution.length > 0 ? (
            <>
              {regionDistribution.map((item) => (
                <div
                  key={item.region}
                  className="poi-list-row"
                  data-testid={`poi-region-row-${item.region}`}
                >
                  <span>{item.region}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}

              {!isFilterRequested && generalRegionState.matchedCount > 0 && (
                <p className="poi-empty" data-testid="poi-region-match-summary">
                  {generalRegionState.matchedCount.toLocaleString("tr-TR")} POI,
                  MAHALLE.geojson sınırlarıyla mekânsal olarak eşleştirildi.
                  {generalRegionState.unmatchedCount > 0
                    ? ` ${generalRegionState.unmatchedCount.toLocaleString(
                        "tr-TR",
                      )} POI sınırların dışında kaldı.`
                    : ""}
                </p>
              )}
            </>
          ) : (
            <div className="poi-data-note" data-testid="poi-region-note">
              <strong>Bölge eşleşmesi bulunamadı.</strong>
              <p>
                POI koordinatları ile MAHALLE.geojson sınırları arasında eşleşme
                bulunamadı. Koordinat sistemi ve veri kapsamı kontrol edilmelidir.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
