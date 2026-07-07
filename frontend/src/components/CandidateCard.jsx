import React from "react";

function formatMoney(value) {
  if (value === null || value === undefined) {
    return "Veri Eksik";
  }

  return `${value.toLocaleString("tr-TR")} TL`;
}

function showScore(value) {
  if (value === null || value === undefined) {
    return "Veri Eksik";
  }

  return value;
}

export default function CandidateCard({ candidate, onSave }) {
  return (
    <div className="candidate-card" data-testid={`candidate-card-${candidate.id}`}>
      <h3 data-testid={`candidate-name-${candidate.id}`}>{candidate.name}</h3>

      <p data-testid={`candidate-address-${candidate.id}`}>
        <strong>Tahmini Adres:</strong> {candidate.estimatedAddress}
      </p>

      <p data-testid={`candidate-region-${candidate.id}`}>
        <strong>Bölge:</strong> {candidate.region}
      </p>

      <p data-testid={`candidate-neighborhood-${candidate.id}`}>
        <strong>Mahalle:</strong> {candidate.neighborhood}
      </p>

      <p data-testid={`candidate-cost-${candidate.id}`}>
        <strong>Tahmini Kurulum Maliyeti:</strong>{" "}
        {formatMoney(candidate.estimatedCost)}
      </p>

      <div className="score-row" data-testid={`candidate-scores-${candidate.id}`}>
        <span data-testid={`candidate-cost-score-${candidate.id}`}>
          Maliyet Skoru: {showScore(candidate.costScore)}
        </span>
        <span data-testid={`candidate-demand-score-${candidate.id}`}>
          Talep Skoru: {showScore(candidate.demandScore)}
        </span>
        <span data-testid={`candidate-general-score-${candidate.id}`}>
          Genel Skor: {showScore(candidate.generalScore)}
        </span>
      </div>

      <p data-testid={`candidate-system-type-${candidate.id}`}>
        <strong>Sistem Tipi:</strong> {candidate.systemType}
      </p>

      <p data-testid={`candidate-place-type-${candidate.id}`}>
        <strong>Mekân Türü:</strong> {candidate.placeType}
      </p>

      {candidate.status === "missing" && (
        <div className="warning-box" data-testid={`candidate-missing-warning-${candidate.id}`}>
          Bazı bilgiler eksik. Veri ekibi bekleniyor.
        </div>
      )}

      <button
        data-testid={`save-candidate-button-${candidate.id}`}
        onClick={() => onSave(candidate)}
      >
        Kaydet
      </button>
    </div>
  );
}
