import "./SuitabilityResultsPanel.css";

function formatScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? score.toFixed(2) : "—";
}

function formatDistance(value) {
  const meters = Number(value);

  if (!Number.isFinite(meters)) {
    return "Veri Eksik";
  }

  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }

  return `${Math.round(meters)} m`;
}

function formatMoney(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Hesaplanamadı";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Hesaplanamadı";
  }

  return `${amount.toLocaleString("tr-TR")} TL`;
}

function getBudgetState(item) {
  const estimatedCost = Number(
    item?.estimatedCost,
  );

  const budgetMax = Number(
    item?.budgetMax ??
      item?.budget,
  );

  if (
    !Number.isFinite(
      estimatedCost,
    ) ||
    !Number.isFinite(
      budgetMax,
    ) ||
    budgetMax <= 0
  ) {
    return null;
  }

  const isWithinBudget =
    typeof item?.isWithinBudget ===
    "boolean"
      ? item.isWithinBudget
      : estimatedCost <=
        budgetMax;

  return {
    estimatedCost,
    budgetMax,
    isWithinBudget,
    difference:
      Math.abs(
        estimatedCost -
          budgetMax,
      ),
  };
}

function getLocationLabel(cell) {
  return (
    [cell?.neighborhoodName, cell?.regionName]
      .filter(Boolean)
      .join(" / ") || "Konum bilgisi yok"
  );
}

export default function SuitabilityResultsPanel({
  status = "idle",
  error = "",
  evaluation = null,
  candidate = null,
  focusedRecommendationCellId = null,
  onRecommendationSelect,
  onSaveCandidate,
  onClose,
}) {
  const recommendations = Array.isArray(evaluation?.recommendations)
    ? evaluation.recommendations
    : [];

  const candidateBudgetState =
    getBudgetState(candidate);

  if (status === "idle" && !evaluation) {
    return null;
  }

  return (
    <aside
      className="suitability-results-panel location-analysis-panel"
      data-testid="suitability-results-panel"
    >
      <div className="suitability-results-header">
        <div>
          <span>Konum analizi</span>
          <h2>Uygunluk sonucu</h2>
        </div>

        <button
          data-suitability-close-button="true"
          type="button"
          onClick={onClose}
          aria-label="Konum analizi panelini kapat"
          data-testid="suitability-results-close"
        >
          ×
        </button>
      </div>

      <section
        className="location-analysis-suitability"
        data-testid="location-analysis-suitability-content"
      >
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
                  <dd>
                    {formatDistance(
                      evaluation.selectedCell.metrics
                        ?.nearestTransformerMeters,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Ana yol</dt>
                  <dd>
                    {formatDistance(
                      evaluation.selectedCell.metrics
                        ?.nearestMajorRoadMeters,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Eğim</dt>
                  <dd>
                    {evaluation.selectedCell.metrics?.slopePercent == null
                      ? "Veri Eksik"
                      : `%${Number(
                          evaluation.selectedCell.metrics.slopePercent,
                        ).toFixed(2)}`}
                  </dd>
                </div>

                <div data-testid="manual-pin-estimated-cost">
                  <dt>Tahmini maliyet</dt>
                  <dd>
                    {formatMoney(candidate?.estimatedCost)}
                  </dd>
                </div>
              </dl>
            )}

            {candidateBudgetState &&
              !candidateBudgetState.isWithinBudget && (
              <div
                data-testid="manual-pin-budget-warning"
                role="alert"
                style={{
                  marginTop: "8px",
                  padding: "7px 9px",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  fontSize: "11px",
                  lineHeight: 1.35,
                }}
              >
                <strong
                  style={{
                    display: "block",
                    marginBottom: "2px",
                    fontSize: "12px",
                    lineHeight: 1.25,
                  }}
                >
                  Kurulum bütçesi aşılıyor
                </strong>

                <span>
                  Tahmini maliyet, bütçeyi{" "}
                  {formatMoney(
                    candidateBudgetState.difference,
                  )}{" "}
                  aşıyor. Bütçe:{" "}
                  {formatMoney(
                    candidateBudgetState.budgetMax,
                  )}
                </span>
              </div>
            )}

            {candidate && (
              <button
                type="button"
                className="suitability-save-button"
                data-testid={`suitability-save-candidate-${candidate.id}`}
                onClick={() => onSaveCandidate?.(candidate)}
              >
                <span aria-hidden="true">+</span>
                <span>Konumu Kaydet</span>
              </button>
            )}
          </div>
        )}
      </section>

      <div
        className="suitability-recommendations"
        data-testid="suitability-recommendations-always-open"
      >
        <div className="suitability-recommendations-title">
          <h3>En yakın öneriler</h3>
          <span>{recommendations.length} alan</span>
        </div>

        {recommendations.length > 0 ? (
          <>
            {recommendations.map((recommendation) => {
              const recommendationBudgetState =
                getBudgetState(
                  recommendation,
                );

              return (
                <button
                  key={recommendation.cellId}
                  type="button"
                  className={
                    String(focusedRecommendationCellId) ===
                    String(recommendation.cellId)
                      ? "suitability-recommendation-card active"
                      : "suitability-recommendation-card"
                  }
                  onClick={() =>
                    onRecommendationSelect?.(
                      recommendation,
                    )
                  }
                  data-testid={`suitability-recommendation-${recommendation.recommendationRank}`}
                >
                  <span className="suitability-rank">
                    {recommendation.recommendationRank}
                  </span>

                  <span className="suitability-recommendation-main">
                    <strong>
                      {getLocationLabel(recommendation)}
                    </strong>

                    <small>
                      {formatDistance(
                        recommendation.distanceMeters,
                      )}
                      {" · Maliyet: "}
                      {formatMoney(
                        recommendation.estimatedCost,
                      )}

                      {recommendationBudgetState &&
                        !recommendationBudgetState.isWithinBudget && (
                        <span
                          data-testid={`recommendation-budget-list-warning-${recommendation.cellId}`}
                          style={{
                            display: "block",
                            marginTop: "2px",
                            color: "#dc2626",
                            fontWeight: 800,
                          }}
                        >
                          Bütçe aşıldı:{" "}
                          {formatMoney(
                            recommendationBudgetState.difference,
                          )}
                        </span>
                      )}
                    </small>
                  </span>

                  <em>
                    {formatScore(
                      recommendation.suitabilityScore,
                    )}
                  </em>
                </button>
              );
            })}
          </>
        ) : (
          <div className="suitability-recommendations-empty">
            {status === "loading"
              ? "Analiz tamamlandığında en yakın öneriler burada listelenecek."
              : status === "error"
                ? "Analiz tamamlanamadığı için öneriler getirilemedi."
                : "Bu konum için yakın öneri bulunamadı."}
          </div>
        )}
      </div>
    </aside>
  );
}
