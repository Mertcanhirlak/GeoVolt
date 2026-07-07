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
    <div className="saved-panel">
      <h2>Kaydedilen Aday Noktalar</h2>

      {savedCandidates.length === 0 && (
        <p className="empty-message">
          Henüz kaydedilen aday nokta bulunmamaktadır.
        </p>
      )}

      {savedCandidates.length > 0 && (
        <div className="saved-list">
          {savedCandidates.map((candidate) => (
            <div key={candidate.id} className="saved-card">
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
