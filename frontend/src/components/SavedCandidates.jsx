import React, { useEffect, useState } from "react";

export default function SavedCandidates({ refreshKey }) {
  const [savedCandidates, setSavedCandidates] = useState([]);

  useEffect(() => {
    loadSavedCandidates();
  }, [refreshKey]);

  function loadSavedCandidates() {
    const data = JSON.parse(localStorage.getItem("savedCandidates")) || [];
    setSavedCandidates(data);
  }

  function removeCandidate(candidateId) {
    const updatedList = savedCandidates.filter(
      (candidate) => candidate.id !== candidateId
    );

    localStorage.setItem("savedCandidates", JSON.stringify(updatedList));
    setSavedCandidates(updatedList);
  }

  return (
    <div className="saved-panel" data-testid="saved-candidates-panel">
      <h2 data-testid="saved-candidates-title">Kaydedilen Aday Noktalar</h2>

      {savedCandidates.length === 0 && (
        <p className="empty-message" data-testid="saved-candidates-empty-message">
          Henüz kaydedilen aday nokta bulunmamaktadır.
        </p>
      )}

      {savedCandidates.length > 0 && (
        <div className="saved-list" data-testid="saved-candidates-list">
          {savedCandidates.map((candidate) => (
            <div
              key={candidate.id}
              className="saved-card"
              data-testid={`saved-candidate-card-${candidate.id}`}
            >
              <h3 data-testid={`saved-candidate-name-${candidate.id}`}>
                {candidate.name}
              </h3>

              <p data-testid={`saved-candidate-address-${candidate.id}`}>
                <strong>Adres:</strong> {candidate.estimatedAddress}
              </p>

              <p data-testid={`saved-candidate-region-${candidate.id}`}>
                <strong>Bölge:</strong> {candidate.region}
              </p>

              <p data-testid={`saved-candidate-general-score-${candidate.id}`}>
                <strong>Genel Skor:</strong>{" "}
                {candidate.generalScore ?? "Veri Eksik"}
              </p>

              <button
                className="delete-button"
                data-testid={`delete-saved-candidate-button-${candidate.id}`}
                onClick={() => removeCandidate(candidate.id)}
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
