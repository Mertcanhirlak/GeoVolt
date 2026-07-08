import React, { useEffect, useState } from "react";
import {
  deleteSavedCandidatePoint,
  getSavedCandidatePoints
} from "../services/savedCandidatePointsApi";

export default function SavedCandidates({ refreshKey }) {
  const [savedCandidates, setSavedCandidates] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSavedCandidates();
  }, [refreshKey]);

  async function loadSavedCandidates() {
    const result = await getSavedCandidatePoints();

    setSavedCandidates(result.data);

    if (result.source === "local-storage") {
      setMessage("Kaydedilenler lokal veriden gösteriliyor.");
      return;
    }

    setMessage("");
  }

  async function handleDelete(candidatePointId) {
    const result = await deleteSavedCandidatePoint(candidatePointId);

    if (result.success) {
      setSavedCandidates((currentCandidates) =>
        currentCandidates.filter((candidate) => candidate.id !== candidatePointId)
      );

      if (result.source === "local-storage") {
        setMessage("Kayıt lokal veriden silindi.");
      } else {
        setMessage("Kayıt API üzerinden silindi.");
      }
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
              <h3>{candidate.name}</h3>

              <p>
                <strong>Adres:</strong> {candidate.estimatedAddress}
              </p>

              <p>
                <strong>Bölge:</strong> {candidate.region}
              </p>

              <p>
                <strong>Genel Skor:</strong>{" "}
                {candidate.generalScore ?? "Veri Eksik"}
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
