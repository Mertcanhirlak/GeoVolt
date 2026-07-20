import "./SuitabilityResultsPanel.css";

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
            }`}
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

            <p>{evaluation.message}</p>

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
