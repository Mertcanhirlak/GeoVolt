import React, { useEffect, useState } from "react";
import { mockCandidatePoints } from "../data/mockCandidatePoints";
import CandidateCard from "../components/CandidateCard";
import CandidateFilters from "../components/CandidateFilters";
import SavedCandidates from "../components/SavedCandidates";
import PersonalizationForm from "../components/PersonalizationForm";

const defaultFilters = {
  costMin: "",
  costMax: "",
  demandMin: "",
  demandMax: "",
  generalMin: "",
  generalMax: ""
};

function getNumberOrDefault(value, defaultValue) {
  if (value === "" || value === null || value === undefined) {
    return defaultValue;
  }

  return Number(value);
}

function isScoreInRange(score, min, max) {
  if (score === null || score === undefined) {
    return false;
  }

  return score >= min && score <= max;
}

export default function CandidatePointsPage() {
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [message, setMessage] = useState("");
  const [savedRefreshKey, setSavedRefreshKey] = useState(0);

  useEffect(() => {
    setMessage("Hesaplanıyor...");

    setTimeout(() => {
      setCandidates(mockCandidatePoints);
      setFilteredCandidates(mockCandidatePoints);
      setMessage("");
    }, 500);
  }, []);

  function validateFilters() {
    const values = Object.values(filters).filter((value) => value !== "");

    for (const value of values) {
      const numberValue = Number(value);

      if (Number.isNaN(numberValue) || numberValue < 0 || numberValue > 100) {
        setMessage("Skor değerleri 0 ile 100 arasında olmalıdır.");
        return false;
      }
    }

    const costMin = getNumberOrDefault(filters.costMin, 0);
    const costMax = getNumberOrDefault(filters.costMax, 100);
    const demandMin = getNumberOrDefault(filters.demandMin, 0);
    const demandMax = getNumberOrDefault(filters.demandMax, 100);
    const generalMin = getNumberOrDefault(filters.generalMin, 0);
    const generalMax = getNumberOrDefault(filters.generalMax, 100);

    if (costMin > costMax || demandMin > demandMax || generalMin > generalMax) {
      setMessage("Minimum değer maksimum değerden büyük olamaz.");
      return false;
    }

    return true;
  }

  function applyFilters() {
    if (!validateFilters()) {
      return;
    }

    const costMin = getNumberOrDefault(filters.costMin, 0);
    const costMax = getNumberOrDefault(filters.costMax, 100);
    const demandMin = getNumberOrDefault(filters.demandMin, 0);
    const demandMax = getNumberOrDefault(filters.demandMax, 100);
    const generalMin = getNumberOrDefault(filters.generalMin, 0);
    const generalMax = getNumberOrDefault(filters.generalMax, 100);

    const result = candidates.filter((candidate) => {
      return (
        isScoreInRange(candidate.costScore, costMin, costMax) &&
        isScoreInRange(candidate.demandScore, demandMin, demandMax) &&
        isScoreInRange(candidate.generalScore, generalMin, generalMax)
      );
    });

    setFilteredCandidates(result);

    if (result.length === 0) {
      setMessage("Uygun aday nokta bulunamadı.");
    } else {
      setMessage("");
    }
  }

  function saveCandidate(candidate) {
    const savedCandidates =
      JSON.parse(localStorage.getItem("savedCandidates")) || [];

    const alreadySaved = savedCandidates.some((item) => item.id === candidate.id);

    if (alreadySaved) {
      setMessage("Bu aday nokta zaten kaydedilmiş.");
      return;
    }

    if (savedCandidates.length >= 10) {
      setMessage("En fazla 10 aday nokta kaydedebilirsiniz.");
      return;
    }

    const updatedSavedCandidates = [...savedCandidates, candidate];

    localStorage.setItem(
      "savedCandidates",
      JSON.stringify(updatedSavedCandidates)
    );

    setSavedRefreshKey(savedRefreshKey + 1);
    setMessage("Aday nokta kaydedildi.");
  }

  return (
    <div className="candidate-page">
      <h1>Aday Şarj İstasyonu Lokasyonları</h1>

      <p className="page-description">
        Bu ekranda aday noktalar mock veri ile gösterilmektedir. Backend ve veri
        ekibi tamamlandığında aynı ekran API verisiyle çalışacaktır.
      </p>

      <PersonalizationForm
        candidates={candidates}
        onResult={setFilteredCandidates}
      />

      <CandidateFilters
        filters={filters}
        setFilters={setFilters}
        onApply={applyFilters}
      />

      {message && <div className="info-message">{message}</div>}

      <div className="candidate-list">
        {filteredCandidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            onSave={saveCandidate}
          />
        ))}
      </div>

      <SavedCandidates refreshKey={savedRefreshKey} />
    </div>
  );
}
