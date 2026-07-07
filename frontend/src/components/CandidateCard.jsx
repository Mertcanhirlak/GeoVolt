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
    <div className="candidate-card">
      <h3>{candidate.name}</h3>

      <p>
        <strong>Tahmini Adres:</strong> {candidate.estimatedAddress}
      </p>

      <p>
        <strong>Bölge:</strong> {candidate.region}
      </p>

      <p>
        <strong>Mahalle:</strong> {candidate.neighborhood}
      </p>

      <p>
        <strong>Tahmini Kurulum Maliyeti:</strong>{" "}
        {formatMoney(candidate.estimatedCost)}
      </p>

      <div className="score-row">
        <span>Maliyet Skoru: {showScore(candidate.costScore)}</span>
        <span>Talep Skoru: {showScore(candidate.demandScore)}</span>
        <span>Genel Skor: {showScore(candidate.generalScore)}</span>
      </div>

      <p>
        <strong>Sistem Tipi:</strong> {candidate.systemType}
      </p>

      <p>
        <strong>Mekân Türü:</strong> {candidate.placeType}
      </p>

      {candidate.status === "missing" && (
        <div className="warning-box">
          Bazı bilgiler eksik. Veri ekibi bekleniyor.
        </div>
      )}

      <button onClick={() => onSave(candidate)}>Kaydet</button>
    </div>
  );
}
