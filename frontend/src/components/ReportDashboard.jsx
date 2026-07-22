import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  LayoutDashboard,
  Power,
  Zap,
} from "lucide-react";

import {
  useAuth,
} from "../context/AuthContext";

import "./ReportDashboard.css";

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ??
    "http://localhost:5000",
).replace(/\/+$/, "");

const REPORT_CHART_COLORS = [
  "#3b54c4",
  "#4a63ce",
  "#5a78d6",
  "#6e93e0",
  "#84a9e6",
  "#94b8eb",
  "#a9c8f0",
];

function toNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const parsedValue =
    Number.parseFloat(
      String(value).replace(
        ",",
        ".",
      ),
    );

  return Number.isFinite(
    parsedValue,
  )
    ? parsedValue
    : 0;
}

function formatCount(value) {
  return Math.round(
    toNumber(value),
  ).toLocaleString("tr-TR");
}

function formatPercentage(value) {
  return toNumber(value)
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
}

function getRegionId(region) {
  const value =
    region?.regionId ??
    region?.RegionId ??
    region?.id ??
    region?.Id ??
    region?.ID;

  const numericValue =
    Number(value);

  return Number.isInteger(
    numericValue,
  ) &&
    numericValue > 0
    ? numericValue
    : null;
}

function getRegionName(region) {
  return String(
    region?.regionName ??
      region?.RegionName ??
      region?.name ??
      region?.Name ??
      "",
  ).trim();
}

function unwrapApiResponse(responseBody) {
  const firstLayer =
    responseBody?.data ??
    responseBody?.result ??
    responseBody?.value ??
    responseBody;

  return (
    firstLayer?.data ??
    firstLayer?.result ??
    firstLayer?.value ??
    firstLayer
  );
}

function normalizeSummary(
  responseBody,
  fallbackRegion,
) {
  const source =
    unwrapApiResponse(
      responseBody,
    );

  if (
    !source ||
    typeof source !== "object" ||
    Array.isArray(source)
  ) {
    throw new Error(
      "Bölge özeti beklenen nesne biçiminde değil.",
    );
  }

  const regionId =
    Number(
      source.regionId ??
        source.RegionId ??
        getRegionId(
          fallbackRegion,
        ),
    );

  const regionName =
    String(
      source.regionName ??
        source.RegionName ??
        getRegionName(
          fallbackRegion,
        ),
    ).trim();

  if (
    !Number.isInteger(
      regionId,
    ) ||
    regionId <= 0 ||
    !regionName
  ) {
    throw new Error(
      "Bölge özeti kimlik bilgileri eksik.",
    );
  }

  const acCount =
    toNumber(
      source.acCount ??
        source.ACCount,
    );

  const dcCount =
    toNumber(
      source.dcCount ??
        source.DCCount,
    );

  const socketTotal =
    acCount + dcCount;

  const rawAcPercentage =
    toNumber(
      source.acPercentage ??
        source.AcPercentage,
    );

  const rawDcPercentage =
    toNumber(
      source.dcPercentage ??
        source.DcPercentage,
    );

  const hasApiPercentages =
    rawAcPercentage > 0 ||
    rawDcPercentage > 0;

  return {
    regionId,
    regionName,

    chargingStationCount:
      toNumber(
        source.chargingStationCount ??
          source.ChargingStationCount,
      ),

    totalChargingStationCount:
      toNumber(
        source.totalChargingStationCount ??
          source.TotalChargingStationCount,
      ),

    chargingStationPercentage:
      toNumber(
        source.chargingStationPercentage ??
          source.ChargingStationPercentage,
      ),

    acCount,
    dcCount,

    acPercentage:
      hasApiPercentages
        ? rawAcPercentage
        : socketTotal > 0
          ? (
              acCount /
              socketTotal
            ) *
            100
          : 0,

    dcPercentage:
      hasApiPercentages
        ? rawDcPercentage
        : socketTotal > 0
          ? (
              dcCount /
              socketTotal
            ) *
            100
          : 0,
  };
}

async function fetchRegionSummary(
  region,
  token,
  signal,
) {
  const regionId =
    getRegionId(region);

  if (!regionId) {
    throw new Error(
      "Geçersiz bölge kimliği.",
    );
  }

  const headers = {
    Accept:
      "application/json",
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const response =
    await fetch(
      `${API_BASE_URL}/api/regions/${regionId}/summary`,
      {
        method: "GET",
        headers,
        signal,
      },
    );

  if (!response.ok) {
    const responseText =
      await response
        .text()
        .catch(() => "");

    throw new Error(
      `Bölge ${regionId} özeti alınamadı. HTTP ${response.status}${
        responseText
          ? `: ${responseText.slice(
              0,
              180,
            )}`
          : ""
      }`,
    );
  }

  const responseBody =
    await response.json();

  return normalizeSummary(
    responseBody,
    region,
  );
}

function buildConicGradient(data) {
  const total =
    data.reduce(
      (sum, item) =>
        sum +
        toNumber(
          item.value,
        ),
      0,
    );

  if (total <= 0) {
    return "#e7edfb";
  }

  let currentValue = 0;

  return `conic-gradient(${data
    .map((item) => {
      const startValue =
        currentValue;

      const endValue =
        currentValue +
        (
          toNumber(
            item.value,
          ) /
          total
        ) *
          100;

      currentValue =
        endValue;

      return `${item.color} ${startValue}% ${endValue}%`;
    })
    .join(", ")})`;
}

function ReportPieChart({
  data,
  centerValue,
}) {
  return (
    <div
      className="report-pie-chart"
      style={{
        background:
          buildConicGradient(
            data,
          ),
      }}
      role="img"
      aria-label="Semtlere göre istasyon dağılımı"
      data-testid="report-region-pie-chart"
    >
      <span>
        <b>
          {formatCount(
            centerValue,
          )}
        </b>

        <small>
          Toplam İstasyon
        </small>
      </span>
    </div>
  );
}

function ReportDonutChart({
  data,
  centerLabel,
}) {
  const total =
    data.reduce(
      (sum, item) =>
        sum +
        toNumber(
          item.value,
        ),
      0,
    );

  const size = 230;
  const strokeWidth = 32;
  const radius =
    (size - strokeWidth) / 2;
  const circumference =
    2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div
      className="report-donut-wrap"
      data-testid="report-socket-donut-chart"
    >
      <svg
        className="report-donut-chart"
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${centerLabel} soket dağılımı`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e7edfb"
          strokeWidth={strokeWidth}
        />

        {data.map((item) => {
          const segmentLength =
            total > 0
              ? (
                  toNumber(
                    item.value,
                  ) /
                  total
                ) *
                circumference
              : 0;

          const dashOffset =
            -currentOffset;

          currentOffset +=
            segmentLength;

          return (
            <circle
              key={item.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${segmentLength} ${
                circumference -
                segmentLength
              }`}
              strokeDashoffset={
                dashOffset
              }
              transform={`rotate(-90 ${
                size / 2
              } ${size / 2})`}
            />
          );
        })}
      </svg>

      <div className="report-donut-center">
        <b>
          {total > 0
            ? `${formatPercentage(
                total,
              )}%`
            : "0%"}
        </b>

        <strong title={centerLabel}>
          {centerLabel || "Semt"}
        </strong>

        <span>
          Soket oranı
        </span>
      </div>
    </div>
  );
}

export default function ReportDashboard({
  regions = [],
}) {
  const {
    token,
  } = useAuth();

  const [
    summaries,
    setSummaries,
  ] = useState([]);

  const [
    selectedRegionId,
    setSelectedRegionId,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const usableRegions =
    useMemo(() => {
      const uniqueRegions =
        new Map();

      regions.forEach(
        (region) => {
          const regionId =
            getRegionId(region);

          if (
            !regionId ||
            uniqueRegions.has(
              regionId,
            )
          ) {
            return;
          }

          uniqueRegions.set(
            regionId,
            {
              ...region,
              regionId,
              regionName:
                getRegionName(
                  region,
                ),
            },
          );
        },
      );

      return Array.from(
        uniqueRegions.values(),
      );
    }, [regions]);

  const regionRequestKey =
    usableRegions
      .map(
        (region) =>
          getRegionId(region),
      )
      .join(",");

  useEffect(() => {
    const controller =
      new AbortController();

    let isMounted = true;

    async function loadSummaries() {
      if (
        usableRegions.length ===
        0
      ) {
        setSummaries([]);
        setSelectedRegionId("");
        setLoading(false);
        setError(
          "Rapor için geçerli bölge bulunamadı.",
        );

        return;
      }

      setLoading(true);
      setError("");

      const results =
        await Promise.allSettled(
          usableRegions.map(
            (region) =>
              fetchRegionSummary(
                region,
                token,
                controller.signal,
              ),
          ),
        );

      if (
        !isMounted ||
        controller.signal.aborted
      ) {
        return;
      }

      const successfulSummaries =
        results
          .filter(
            (result) =>
              result.status ===
              "fulfilled",
          )
          .map(
            (result) =>
              result.value,
          )
          .sort(
            (
              firstSummary,
              secondSummary,
            ) =>
              firstSummary.regionName.localeCompare(
                secondSummary.regionName,
                "tr-TR",
              ),
          );

      const failedResults =
        results.filter(
          (result) =>
            result.status ===
            "rejected",
        );

      failedResults.forEach(
        (result) => {
          console.error(
            "[GeoVolt][Report API]",
            result.reason,
          );
        },
      );

      setSummaries(
        successfulSummaries,
      );

      if (
        successfulSummaries.length ===
        0
      ) {
        setSelectedRegionId("");
        setError(
          "Gerçek rapor verileri alınamadı. Backend, oturum tokenı ve VITE_API_BASE_URL değerini kontrol edin.",
        );
      }
      else if (
        failedResults.length > 0
      ) {
        setError(
          `${failedResults.length} bölgenin özeti alınamadı; alınabilen gerçek veriler gösteriliyor.`,
        );
      }

      setSelectedRegionId(
        (currentValue) => {
          const currentRegionId =
            Number(currentValue);

          const currentExists =
            successfulSummaries.some(
              (summary) =>
                summary.regionId ===
                currentRegionId,
            );

          return currentExists
            ? String(
                currentRegionId,
              )
            : String(
                successfulSummaries[0]
                  ?.regionId ??
                  "",
              );
        },
      );

      setLoading(false);
    }

    loadSummaries();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [
    regionRequestKey,
    token,
  ]);

  const selectedSummary =
    summaries.find(
      (summary) =>
        summary.regionId ===
        Number(selectedRegionId),
    ) ??
    summaries[0] ??
    null;

  const summedStationCount =
    summaries.reduce(
      (total, summary) =>
        total +
        summary.chargingStationCount,
      0,
    );

  const reportedStationTotal =
    Math.max(
      0,
      ...summaries.map(
        (summary) =>
          summary.totalChargingStationCount,
      ),
    );

  const totalStationCount =
    reportedStationTotal > 0
      ? reportedStationTotal
      : summedStationCount;

  const totalAcCount =
    summaries.reduce(
      (total, summary) =>
        total +
        summary.acCount,
      0,
    );

  const totalDcCount =
    summaries.reduce(
      (total, summary) =>
        total +
        summary.dcCount,
      0,
    );

  const totalSocketCount =
    totalAcCount +
    totalDcCount;

  const regionDistribution =
    summaries.map(
      (summary, index) => ({
        label:
          summary.regionName,

        value:
          summary.chargingStationPercentage >
          0
            ? summary.chargingStationPercentage
            : totalStationCount > 0
              ? (
                  summary.chargingStationCount /
                  totalStationCount
                ) *
                100
              : 0,

        color:
          REPORT_CHART_COLORS[
            index %
              REPORT_CHART_COLORS.length
          ],
      }),
    );

  const socketDistribution =
    selectedSummary
      ? [
          {
            label:
              "AC (Yavaş)",

            value:
              selectedSummary.acPercentage,

            color:
              "#3b54c4",
          },
          {
            label:
              "DC (Hızlı)",

            value:
              selectedSummary.dcPercentage,

            color:
              "#6ea0e0",
          },
        ]
      : [];

  return (
    <section
      className="report-screen report-dashboard-v2"
      data-testid="report-screen"
    >
      <header className="report-page-header">
        <span>
          Rapor Merkezi
        </span>

        <h1>
          İstasyon analiz raporları
        </h1>

        <p>
          Bölge, mahalle ve soket tiplerine göre dağılımı tek ekranda takip edin.
        </p>
      </header>

      {loading && (
        <div
          className="report-status-card"
          role="status"
          data-testid="report-loading-state"
        >
          Gerçek rapor verileri yükleniyor...
        </div>
      )}

      {!loading && error && (
        <div
          className="report-status-card report-status-card-error"
          role="alert"
          data-testid="report-error-state"
        >
          {error}
        </div>
      )}

      <div className="report-dashboard-layout">
        <div className="report-kpi-column report-kpi-left">
          <article
            className="report-kpi-card report-kpi-stations"
            data-testid="report-total-stations-card"
          >
            <span className="report-kpi-icon">
              <LayoutDashboard
                size={20}
                aria-hidden="true"
              />
            </span>

            <p>
              Toplam İstasyon
            </p>

            <strong>
              {formatCount(
                totalStationCount,
              )}
            </strong>

            <small>
              Canlı bölge verisi
            </small>
          </article>

          <article
            className="report-kpi-card report-kpi-sockets"
            data-testid="report-total-sockets-card"
          >
            <span className="report-kpi-icon">
              <Zap
                size={20}
                aria-hidden="true"
              />
            </span>

            <p>
              Toplam Soket
            </p>

            <strong>
              {formatCount(
                totalSocketCount,
              )}
            </strong>

            <small>
              AC ve DC toplamı
            </small>
          </article>

          <article
            className="report-kpi-card report-kpi-ac"
            data-testid="report-ac-sockets-card"
          >
            <span className="report-kpi-icon">
              <Power
                size={20}
                aria-hidden="true"
              />
            </span>

            <p>
              AC Soket
            </p>

            <strong>
              {formatCount(
                totalAcCount,
              )}
            </strong>

            <small>
              Yavaş şarj soketi
            </small>
          </article>

          <article
            className="report-kpi-card report-kpi-dc"
            data-testid="report-dc-sockets-card"
          >
            <span className="report-kpi-icon">
              <Zap
                size={20}
                aria-hidden="true"
              />
            </span>

            <p>
              DC Soket
            </p>

            <strong>
              {formatCount(
                totalDcCount,
              )}
            </strong>

            <small>
              Hızlı şarj soketi
            </small>
          </article>
        </div>

        <div className="report-chart-grid">
          <article className="report-chart-card">
            <div className="report-card-heading">
              <span>
                Genel Dağılım
              </span>

              <h2>
                Semtlere Göre İstasyon Dağılımı
              </h2>

              <p>
                Mevcut istasyonların bölgesel payı.
              </p>
            </div>

            <ReportPieChart
              data={
                regionDistribution
              }
              centerValue={
                totalStationCount
              }
            />

            <div className="report-legend">
              {summaries.map(
                (
                  summary,
                  index,
                ) => (
                  <div
                    className="report-legend-row"
                    key={
                      summary.regionId
                    }
                    data-testid={`report-region-row-${summary.regionId}`}
                  >
                    <span
                      className="report-dot"
                      style={{
                        backgroundColor:
                          REPORT_CHART_COLORS[
                            index %
                              REPORT_CHART_COLORS.length
                          ],
                      }}
                    />

                    <strong>
                      {
                        summary.regionName
                      }
                    </strong>

                    <em>
                      %
                      {formatPercentage(
                        summary.chargingStationPercentage >
                        0
                          ? summary.chargingStationPercentage
                          : totalStationCount >
                              0
                            ? (
                                summary.chargingStationCount /
                                totalStationCount
                              ) *
                              100
                            : 0,
                      )}
                    </em>
                  </div>
                ),
              )}
            </div>
          </article>

          <article className="report-chart-card">
            <div className="report-card-heading report-card-heading-row">
              <div>
                <span>
                  Semt analizi
                </span>

                <h2>
                  Semt Bazlı Soket Dağılımı
                </h2>

                <p>
                  Seçilen semte göre gerçek AC/DC oranı.
                </p>
              </div>

              <label className="report-select-shell">
                <span>
                  Semt seç
                </span>

                <select
                  value={
                    selectedRegionId
                  }
                  disabled={
                    summaries.length ===
                    0
                  }
                  data-testid="report-region-select"
                  onChange={(
                    event,
                  ) =>
                    setSelectedRegionId(
                      event.target.value,
                    )
                  }
                >
                  {summaries.map(
                    (summary) => (
                      <option
                        key={
                          summary.regionId
                        }
                        value={
                          String(
                            summary.regionId,
                          )
                        }
                      >
                        {
                          summary.regionName
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>

            <div className="report-socket-layout">
              <ReportDonutChart
                data={
                  socketDistribution
                }
                centerLabel={
                  selectedSummary?.regionName ??
                  "Semt"
                }
              />

              <div className="report-analysis-bars">
                {socketDistribution.map(
                  (item) => (
                    <div
                      className="report-analysis-row"
                      key={item.label}
                    >
                      <div className="report-analysis-label">
                        <span
                          className="report-dot"
                          style={{
                            backgroundColor:
                              item.color,
                          }}
                        />

                        <strong>
                          {item.label}
                        </strong>

                        <em>
                          %
                          {formatPercentage(
                            item.value,
                          )}
                        </em>
                      </div>

                      <div className="report-analysis-track">
                        <span
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                toNumber(
                                  item.value,
                                ),
                              ),
                            )}%`,

                            backgroundColor:
                              item.color,
                          }}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
