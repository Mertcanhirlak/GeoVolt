import { useEffect, useMemo, useRef, useState } from "react";
import Feature from "ol/Feature";
import OlMap from "ol/Map";
import View from "ol/View";
import GeoJSON from "ol/format/GeoJSON";
import Point from "ol/geom/Point";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import "ol/ol.css";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import { Fill, Icon, Stroke, Style } from "ol/style";
import { mockChargingStations } from "../data/mockChargingStations";
import {
  getChargingStationDetail,
  getChargingStations,
  getRegions,
  getRegionSummary,
} from "../services/mapDataApi";
import "./ExistingStationsMap.css";

const CANKAYA_CENTER = fromLonLat([32.8541, 39.9208]);

const regionColors = [
  "rgba(74, 222, 128, 0.54)",
  "rgba(96, 165, 250, 0.5)",
  "rgba(250, 204, 21, 0.52)",
  "rgba(248, 113, 113, 0.48)",
  "rgba(192, 132, 252, 0.5)",
  "rgba(45, 212, 191, 0.5)",
];

const regionStyleCache = new Map();

function formatConnectors(connectors = []) {
  if (!Array.isArray(connectors) || connectors.length === 0) return null;

  return connectors
    .map((connector) => {
      const quantity = connector.quantity > 1 ? `${connector.quantity}x ` : "";
      return `${quantity}${connector.socketType}`;
    })
    .join(" + ");
}

function formatPower(connectors = []) {
  if (!Array.isArray(connectors) || connectors.length === 0) return null;

  const maxPower = Math.max(...connectors.map((connector) => Number(connector.powerKw) || 0));
  return maxPower > 0 ? `${maxPower} kW` : null;
}

function normalizeStation(station, regionLookup = new Map()) {
  const status = station.status ?? (station.isActive === false ? "Pasif" : "Aktif");
  const regionName = station.regionName || regionLookup.get(station.regionId);
  const connectorText = formatConnectors(station.connectors);
  const powerText = formatPower(station.connectors);

  return {
    id: station.id,
    name: station.name || "Sarj Istasyonu",
    district: station.district || "Cankaya",
    neighborhood: station.neighborhood || regionName || "Bolge bilgisi yok",
    address: station.address || `${station.neighborhood || regionName || "Cankaya"}, Ankara`,
    latitude: Number(station.latitude),
    longitude: Number(station.longitude),
    socketType: station.socketType || station.connectorType || connectorText || "Soket bilgisi yok",
    status,
    power: station.power || powerText || station.operatorName || "Guc bilgisi yok",
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

function createPinStyle(station, isSelected) {
  const color = station.status === "Aktif" ? "#ef233c" : "#f59e0b";

  return new Style({
    image: new Icon({
      src:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38"><path d="M15 36s12-11.5 12-22A12 12 0 1 0 3 14c0 10.5 12 22 12 22z" fill="${isSelected ? "#2563eb" : color}" stroke="white" stroke-width="3"/><circle cx="15" cy="14" r="4.6" fill="white"/></svg>`
        ),
      anchor: [0.5, 1],
      scale: isSelected ? 1.12 : 0.82,
    }),
  });
}

function createStationFeature(station, selectedStationId) {
  if (!Number.isFinite(station.longitude) || !Number.isFinite(station.latitude)) return null;

  const feature = new Feature({
    geometry: new Point(fromLonLat([station.longitude, station.latitude])),
    station,
    featureType: "station",
  });

  feature.setStyle(createPinStyle(station, station.id === selectedStationId));
  return feature;
}

function createRegionStyle(feature) {
  const index = feature.get("regionIndex") ?? 0;
  const isSelected = feature.get("selected") === true;
  const cacheKey = `${index % regionColors.length}-${isSelected ? "selected" : "default"}`;

  if (regionStyleCache.has(cacheKey)) {
    return regionStyleCache.get(cacheKey);
  }

  const style = new Style({
    fill: new Fill({
      color: isSelected ? "rgba(132, 255, 80, 0.52)" : regionColors[index % regionColors.length],
    }),
    stroke: new Stroke({
      color: isSelected ? "#dc2626" : "rgba(239, 68, 68, 0.85)",
      width: isSelected ? 5 : 3.5,
    }),
  });

  regionStyleCache.set(cacheKey, style);
  return style;
}

function createRegionFeatures(regions) {
  const parser = new GeoJSON();

  return regions.flatMap((region, index) => {
    if (!region.boundaryGeoJson) return [];

    try {
      const geoJson = JSON.parse(region.boundaryGeoJson);
      const features = parser.readFeatures(geoJson, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });

      return features.map((feature) => {
        feature.set("featureType", "region");
        feature.set("region", region);
        feature.set("regionId", region.id);
        feature.set("name", region.name);
        feature.set("regionIndex", index);
        feature.set("selected", false);
        return feature;
      });
    } catch {
      return [];
    }
  });
}

export default function ExistingStationsMap({ searchTerm = "", mapStep = 1 }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const stationSourceRef = useRef(new VectorSource());
  const regionSourceRef = useRef(new VectorSource());
  const stationLayerRef = useRef(null);
  const regionLayerRef = useRef(null);
  const latestRef = useRef({
    stations: mockChargingStations,
    regions: [],
    source: "mock",
    mapStep,
    selectedStationId: null,
  });

  const [stations, setStations] = useState(mockChargingStations);
  const [regions, setRegions] = useState([]);
  const [source, setSource] = useState("mock");
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [regionSummary, setRegionSummary] = useState(null);
  const [popupPixel, setPopupPixel] = useState(null);
  const [loadingDetailId, setLoadingDetailId] = useState(null);
  const [loadingRegionSummary, setLoadingRegionSummary] = useState(false);

  const visibleStations = useMemo(() => {
    return stations.filter((station) => matchesSearch(station, searchTerm));
  }, [searchTerm, stations]);

  const selectedStation = visibleStations.find((station) => station.id === selectedStationId) ?? null;

  useEffect(() => {
    latestRef.current = { stations, regions, source, mapStep, selectedStationId };
  }, [stations, regions, source, mapStep, selectedStationId]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const regionLayer = new VectorLayer({
      source: regionSourceRef.current,
      style: createRegionStyle,
      visible: false,
      zIndex: 2,
    });

    const stationLayer = new VectorLayer({
      source: stationSourceRef.current,
      zIndex: 5,
    });

    const map = new OlMap({
      target: mapElementRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        regionLayer,
        stationLayer,
      ],
      view: new View({
        center: CANKAYA_CENTER,
        zoom: 12.4,
        minZoom: 10.5,
        maxZoom: 17,
      }),
      controls: [],
    });

    map.on("moveend", () => {
      const station = latestRef.current.stations.find(
        (item) => item.id === latestRef.current.selectedStationId
      );
      if (!station) return;

      setPopupPixel(map.getPixelFromCoordinate(fromLonLat([station.longitude, station.latitude])));
    });

    map.on("singleclick", (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (item) => item, {
        hitTolerance: 6,
      });

      if (!feature) return;

      if (feature.get("featureType") === "station") {
        selectStation(feature.get("station")?.id);
        return;
      }

      if (latestRef.current.mapStep > 1 && feature.get("featureType") === "region") {
        selectRegion(feature.get("regionId"));
      }
    });

    mapRef.current = map;
    regionLayerRef.current = regionLayer;
    stationLayerRef.current = stationLayer;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      regionLayerRef.current = null;
      stationLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadMapData() {
      try {
        const [stationData, regionData] = await Promise.all([getChargingStations(), getRegions()]);

        if (!isMounted) return;

        const safeRegions = Array.isArray(regionData) ? regionData : [];
        const regionLookup = new Map(safeRegions.map((region) => [region.id, region.name]));

        setRegions(safeRegions);
        setStations(stationData.map((station) => normalizeStation(station, regionLookup)));
        setSource("api");
      } catch {
        if (!isMounted) return;

        setRegions([]);
        setStations(mockChargingStations);
        setSource("mock");
      }
    }

    loadMapData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const features = visibleStations
      .map((station) => createStationFeature(station, selectedStationId))
      .filter(Boolean);

    stationSourceRef.current.clear();
    stationSourceRef.current.addFeatures(features);
  }, [visibleStations, selectedStationId]);

  useEffect(() => {
    const features = createRegionFeatures(regions);

    regionSourceRef.current.clear();
    regionSourceRef.current.addFeatures(features);
  }, [regions]);

  useEffect(() => {
    const regionsActive = mapStep > 1;

    if (regionLayerRef.current) {
      regionLayerRef.current.setVisible(Boolean(regionsActive));
    }

    if (!regionsActive) {
      clearRegionSelection(false);
      return;
    }

    if (mapStep === 2) {
      clearRegionSelection(false);
    }

    setSelectedStationId(null);
    setPopupPixel(null);

    const extent = regionSourceRef.current.getExtent();
    if (extent && Number.isFinite(extent[0]) && mapRef.current) {
      mapRef.current.getView().fit(extent, {
        padding: [110, 110, 80, 110],
        maxZoom: 12.2,
        duration: 350,
      });
    }
  }, [mapStep]);

  useEffect(() => {
    if (!selectedStation || !mapRef.current) {
      setPopupPixel(null);
      return;
    }

    setPopupPixel(
      mapRef.current.getPixelFromCoordinate(fromLonLat([selectedStation.longitude, selectedStation.latitude]))
    );
  }, [selectedStation]);

  async function selectStation(stationId) {
    if (!stationId) return;

    setSelectedStationId(stationId);

    const station = latestRef.current.stations.find((item) => item.id === stationId);
    if (station && mapRef.current) {
      setPopupPixel(
        mapRef.current.getPixelFromCoordinate(fromLonLat([station.longitude, station.latitude]))
      );
    }

    if (latestRef.current.source !== "api") return;

    setLoadingDetailId(stationId);

    try {
      const detail = await getChargingStationDetail(stationId);
      const regionLookup = new Map(latestRef.current.regions.map((region) => [region.id, region.name]));
      const normalizedDetail = normalizeStation(detail, regionLookup);

      setStations((currentStations) =>
        currentStations.map((item) => (item.id === stationId ? normalizedDetail : item))
      );
    } catch {
      // Optional detail request failed; keep the list data visible.
    } finally {
      setLoadingDetailId(null);
    }
  }

  async function selectRegion(regionId) {
    if (!regionId) return;

    const region = latestRef.current.regions.find((item) => item.id === regionId);
    if (!region) return;

    setSelectedRegion(region);
    setSelectedStationId(null);
    setRegionSummary(null);
    setLoadingRegionSummary(true);

    let selectedFeature = null;
    regionSourceRef.current.getFeatures().forEach((feature) => {
      const isSelected = feature.get("regionId") === regionId;
      feature.set("selected", isSelected);
      feature.changed();
      if (isSelected) selectedFeature = feature;
    });

    const extent = selectedFeature?.getGeometry()?.getExtent();
    if (extent && mapRef.current) {
      mapRef.current.getView().fit(extent, {
        padding: [86, 360, 72, 92],
        maxZoom: 14.8,
        duration: 350,
      });
    }

    if (latestRef.current.source !== "api") {
      setRegionSummary({
        regionId,
        regionName: region.name,
        chargingStationCount: visibleStations.length,
        trafficLevel: "Mock veri",
        mostCommonSocketType: "CCS",
        mostCommonPowerKw: 180,
        companyDistribution: [],
      });
      setLoadingRegionSummary(false);
      return;
    }

    try {
      const [summary, stationData] = await Promise.all([
        getRegionSummary(regionId),
        getChargingStations(regionId),
      ]);
      const regionLookup = new Map(latestRef.current.regions.map((item) => [item.id, item.name]));

      setRegionSummary(summary);
      setStations(stationData.map((station) => normalizeStation(station, regionLookup)));
    } catch {
      setRegionSummary({
        regionId,
        regionName: region.name,
        chargingStationCount: 0,
        trafficLevel: "Veri alinamadi",
        mostCommonSocketType: null,
        mostCommonPowerKw: null,
        companyDistribution: [],
      });
    } finally {
      setLoadingRegionSummary(false);
    }
  }

  async function clearRegionSelection(restoreStations = true) {
    setSelectedRegion(null);
    setRegionSummary(null);

    regionSourceRef.current.getFeatures().forEach((feature) => {
      feature.set("selected", false);
      feature.changed();
    });

    if (mapRef.current) {
      mapRef.current.getView().animate({
        center: CANKAYA_CENTER,
        zoom: 12.4,
        duration: 300,
      });
    }

    if (!restoreStations) return;

    if (latestRef.current.source !== "api") {
      setStations(mockChargingStations);
      return;
    }

    try {
      const stationData = await getChargingStations();
      const regionLookup = new Map(latestRef.current.regions.map((item) => [item.id, item.name]));
      setStations(stationData.map((station) => normalizeStation(station, regionLookup)));
    } catch {
      setStations(mockChargingStations);
    }
  }

  return (
    <div className="existing-map" data-testid="existing-stations-map">
      <div ref={mapElementRef} className="openlayers-map" />

      <div className="map-step-badge">
        {mapStep === 1 && "1 / Mevcut istasyonlar"}
        {mapStep === 2 && "2 / Bolgeler aktif"}
        {mapStep === 3 && "3 / Bolge detayi"}
      </div>

      {mapStep > 1 && selectedRegion && (
        <>
          <aside className="region-summary-card" data-testid="region-summary-card">
            <header>
              <strong>{regionSummary?.regionName || selectedRegion.name}</strong>
              <span>Semt Bilgi Paneli</span>
            </header>

            {loadingRegionSummary ? (
              <p className="region-summary-loading">Yukleniyor...</p>
            ) : (
              <div className="region-summary-content">
                <dl>
                  <div>
                    <dt>Istasyon</dt>
                    <dd>{regionSummary?.chargingStationCount ?? 0}</dd>
                  </div>
                  <div>
                    <dt>Trafik</dt>
                    <dd>{regionSummary?.trafficLevel || "Veri yok"}</dd>
                  </div>
                  <div>
                    <dt>Yaygin Soket</dt>
                    <dd>{regionSummary?.mostCommonSocketType || "Veri yok"}</dd>
                  </div>
                  <div>
                    <dt>Yaygin Guc</dt>
                    <dd>
                      {regionSummary?.mostCommonPowerKw
                        ? `${regionSummary.mostCommonPowerKw} kW`
                        : "Veri yok"}
                    </dd>
                  </div>
                </dl>

                <div className="company-distribution">
                  <span>Firma Dagilimi</span>
                  {(regionSummary?.companyDistribution || []).slice(0, 4).map((company) => (
                    <p key={company.companyName}>
                      <strong>{company.companyName}</strong>
                      <em>{company.stationCount}</em>
                    </p>
                  ))}
                  {(regionSummary?.companyDistribution || []).length === 0 && (
                    <p>
                      <strong>Veri yok</strong>
                      <em>-</em>
                    </p>
                  )}
                </div>
              </div>
            )}
          </aside>

          <button type="button" className="region-back-button" onClick={() => clearRegionSelection(true)}>
            Bolgelere geri don
          </button>
        </>
      )}

      <div
        className="existing-station-popup"
        data-testid="existing-station-popup"
        style={
          selectedStation && popupPixel
            ? { left: `${popupPixel[0] + 16}px`, top: `${popupPixel[1] - 12}px` }
            : undefined
        }
      >
        {selectedStation && (
          <>
            <div>
              <span>{selectedStation.neighborhood}</span>
              <strong>{selectedStation.status}</strong>
            </div>

            <h2>{selectedStation.name}</h2>
            <p>{selectedStation.address}</p>

            <dl>
              <div>
                <dt>Soket</dt>
                <dd>{loadingDetailId === selectedStation.id ? "Yukleniyor..." : selectedStation.socketType}</dd>
              </div>
              <div>
                <dt>Guc</dt>
                <dd>{selectedStation.power}</dd>
              </div>
            </dl>
          </>
        )}
      </div>

      <div className="existing-map-source">{source === "api" ? "Canli veri" : "Mock veri"}</div>
    </div>
  );
}
