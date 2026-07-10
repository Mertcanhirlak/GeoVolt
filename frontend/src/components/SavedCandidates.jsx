import React, { useEffect, useState } from "react";
import {
  deleteSavedCandidatePoint,
  getSavedCandidatePoints
} from "../services/savedCandidatePointsApi";

function formatMoney(value) {
  if (value === null || value === undefined) {
    return "Veri Eksik";
  }

  return `${Number(value).toLocaleString("tr-TR")} TL`;
}

function showValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Veri Eksik";
  }

  return value;
}

function showCoordinate(latitude, longitude) {
  if (!latitude || !longitude) {
    return "Veri Eksik";
  }

  return `${latitude}, ${longitude}`;
}

export default function SavedCandidates({ refreshKey }) {
  const [savedCandidates, setSavedCandidates] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSavedCandidates();
  }, [refreshKey]);

  async function loadSavedCandidates() {
    const result = await getSavedCandidatePoints();

    setSavedCandidates(result.data || []);

    if (result.source === "api-and-local-storage") {
      setMessage("Kaydedilenler sunucu ve yerel verilerden gösteriliyor.");
      return;
    }

    if (result.source === "local-storage") {
      setMessage("Kaydedilenler yerel verilerden gösteriliyor.");
      return;
    }

    setMessage("");
  }

  async function handleDelete(candidatePointId) {
    const result = await deleteSavedCandidatePoint(candidatePointId);

    if (result.success) {
      setSavedCandidates((currentCandidates) =>
        currentCandidates.filter(
          (candidate) => String(candidate.id) !== String(candidatePointId)
        )
      );

      if (result.source === "api-and-local-storage") {
        setMessage("Kayıt sunucu ve yerel verilerden silindi.");
        return;
      }

      setMessage("Kayıt yerel verilerden silindi.");
    }
  }

  return (
    <div className="saved-panel" data-testid="saved-candidates-panel">
      <h2>Kaydedilen Aday Noktalar</h2>

      {message && (
        <div className="info-message" data-testid="saved-candidates-message">
          {message}
        </div>
      )}

      {savedCandidates.length === 0 ? (
        <p className="empty-message" data-testid="saved-candidates-empty-message">
          Henüz kaydedilen aday nokta bulunmamaktadır.
        </p>
      ) : (
        <div className="saved-list" data-testid="saved-candidates-list">
          {savedCandidates.map((candidate) => (
            <div
              key={candidate.id}
              className="saved-card"
              data-testid={`saved-candidate-card-${candidate.id}`}
            >
              <div className="saved-card-header">
                <div>
                  <h3>{showValue(candidate.name)}</h3>
                  <span>{showValue(candidate.status)}</span>
                </div>
              </div>

              <p>
                <strong>Adres:</strong> {showValue(candidate.estimatedAddress)}
              </p>

              <p>
                <strong>Bölge:</strong> {showValue(candidate.region)}
              </p>

              <p>
                <strong>Mahalle:</strong> {showValue(candidate.neighborhood)}
              </p>

              <p>
                <strong>Tahmini Kurulum Maliyeti:</strong>{" "}
                {formatMoney(candidate.estimatedCost)}
              </p>

              <p>
                <strong>Maliyet Skoru:</strong> {showValue(candidate.costScore)}
              </p>

              <p>
                <strong>Talep Skoru:</strong> {showValue(candidate.demandScore)}
              </p>

              <p>
                <strong>Genel Skor:</strong> {showValue(candidate.generalScore)}
              </p>

              <p>
                <strong>Sistem Tipi:</strong> {showValue(candidate.systemType)}
              </p>

              <p>
                <strong>Mekân Türü:</strong> {showValue(candidate.placeType)}
              </p>

              <p>
                <strong>Koordinat:</strong>{" "}
                {showCoordinate(candidate.latitude, candidate.longitude)}
              </p>

              <button
                className="delete-button"
                data-testid={`delete-saved-candidate-button-${candidate.id}`}
                onClick={() => handleDelete(candidate.id)}
              >
                Kaydı Sil
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
