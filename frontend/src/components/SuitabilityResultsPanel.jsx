import "./SuitabilityResultsPanel.css";

const STATUS_LABELS = {
  CANDIDATE: "Uygunluk adayı",
  LOW_SUITABILITY: "Düşük uygunluk",
  HARD_EXCLUSION: "Kesin engel",
  INSUFFICIENT_DATA: "Veri doğrulaması gerekli",
  OUTSIDE_STUDY_AREA: "Çalışma alanı dışında",
};

const REASON_LABELS = {
  DATASET_COVERAGE_UNVERIFIED: "Veri katmanlarının kapsam doğrulaması tamamlanmadı.",
  TRANSFORMER_DISTANCE_MISSING: "Trafo mesafesi hesaplanamadı.",
  MAJOR_ROAD_DISTANCE_MISSING: "Ana yol mesafesi hesaplanamadı.",
  STATION_DISTANCE_MISSING: "Şarj istasyonu mesafesi hesaplanamadı.",
  POI_METRIC_MISSING: "POI yoğunluğu hesaplanamadı.",
  POPULATION_DENSITY_MISSING: "Nüfus yoğunluğu hesaplanamadı.",
  SLOPE_DATA_MISSING: "Eğim verisi bulunamadı.",
  MAJOR_ROAD_DISTANCE_WARNING: "Ana yola uzaklık 1 km'nin üzerinde.",
  STEEP_SLOPE_WARNING: "Eğim %15 veya üzerinde; saha doğrulaması gerekir.",
};

function getReasonLabels(reasonCodes) {
  return (Array.isArray(reasonCodes) ? reasonCodes : [])
    .map((reasonCode) => REASON_LABELS[reasonCode])
    .filter(Boolean);
}

function formatScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? score.toFixed(2) : "—";
}

function formatDistance(value) {
  const meters = Number(value);

  if (!Number.isFinite(meters)) {
    return "Mesafe hesaplanamadı";
  }

  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }

  return `${Math.round(meters)} m`;
}

function getLocationLabel(cell) {
  return [cell?.neighborhoodName, cell?.regionName]
    .filter(Boolean)
    .join(" / ") || "Konum bilgisi yok";
}

export default function SuitabilityResultsPanel({
  status = "idle",
  error = "",
  evaluation = null,
  focusedRecommendationCellId = null,
  onRecommendationSelect,
  onClose,
}) {
  if (status === "idle") {
    return null;
  }

  const selectedStatus = evaluation?.selectedCell?.evaluationStatus;
  const selectedReasons = getReasonLabels(
    evaluation?.selectedCell?.reasonCodes,
  );

  return (
    <aside
      className="suitability-results-panel"
      data-testid="suitability-results-panel"
    >
      <div className="suitability-results-header">
        <div>
          <span>Konum analizi</span>
          <h2>Uygunluk sonucu</h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Uygunluk panelini kapat"
          data-testid="suitability-results-close"
        >
          ×
        </button>
      </div>

      {status === "loading" && (
        <div className="suitability-panel-state loading">
          <i aria-hidden="true" />
          <span>Seçilen alan değerlendiriliyor…</span>
        </div>
      )}

      {status === "error" && (
        <div className="suitability-panel-state error">
          {error || "Konum değerlendirilemedi."}
        </div>
      )}

      {status === "success" && evaluation && (
        <>
          <div
            className={`suitability-selected-card ${
              evaluation.selectedCell?.isProvisionalRecommendation
                ? "recommended"
                : ""
            } status-${String(selectedStatus || "unknown").toLowerCase()}`}
          >
            <div className="suitability-card-title">
              <span>Seçilen alan</span>
              <strong>
                {formatScore(evaluation.selectedCell?.suitabilityScore)}
              </strong>
            </div>

            <h3>
              {evaluation.selectedCell
                ? getLocationLabel(evaluation.selectedCell)
                : evaluation.districtName || "Çalışma alanı dışında"}
            </h3>

            <span className="suitability-status-badge">
              {STATUS_LABELS[selectedStatus] || "Değerlendirilmedi"}
            </span>

            <p>{evaluation.message}</p>

            {selectedReasons.length > 0 && (
              <ul className="suitability-reason-list">
                {selectedReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}

            {evaluation.selectedCell && (
              <dl className="suitability-selected-metrics">
                <div>
                  <dt>Trafo</dt>
                  <dd>{formatDistance(evaluation.selectedCell.metrics?.nearestTransformerMeters)}</dd>
                </div>
                <div>
                  <dt>Ana yol</dt>
                  <dd>{formatDistance(evaluation.selectedCell.metrics?.nearestMajorRoadMeters)}</dd>
                </div>
                <div>
                  <dt>Eğim</dt>
                  <dd>
                    {evaluation.selectedCell.metrics?.slopePercent == null
                      ? "—"
                      : `%${Number(evaluation.selectedCell.metrics.slopePercent).toFixed(2)}`}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          {evaluation.recommendations?.length > 0 && (
            <div className="suitability-recommendations">
              <div className="suitability-recommendations-title">
                <h3>En yakın öneriler</h3>
                <span>{evaluation.recommendations.length} alan</span>
              </div>

              {evaluation.recommendations.map((recommendation) => (
                <button
                  key={recommendation.cellId}
                  type="button"
                  className={
                    String(focusedRecommendationCellId) ===
                    String(recommendation.cellId)
                      ? "suitability-recommendation-card active"
                      : "suitability-recommendation-card"
                  }
                  onClick={() => onRecommendationSelect?.(recommendation)}
                  data-testid={`suitability-recommendation-${recommendation.recommendationRank}`}
                >
                  <span className="suitability-rank">
                    {recommendation.recommendationRank}
                  </span>

                  <span className="suitability-recommendation-main">
                    <strong>{getLocationLabel(recommendation)}</strong>
                    <small>{formatDistance(recommendation.distanceMeters)}</small>
                    {getReasonLabels(recommendation.reasonCodes).map((reason) => (
                      <small className="suitability-recommendation-warning" key={reason}>
                        {reason}
                      </small>
                    ))}
                  </span>

                  <em>{formatScore(recommendation.suitabilityScore)}</em>
                </button>
              ))}

              <small className="suitability-provisional-note">
                Öneriler veri kapsamı doğrulanana kadar geçicidir.
              </small>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
