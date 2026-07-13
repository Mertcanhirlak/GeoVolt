import React from "react";

const emptyFilters = {
  costMin: "",
  costMax: "",
  demandMin: "",
  demandMax: "",
  generalMin: "",
  generalMax: ""
};

export default function CandidateFilters({ filters, setFilters, onApply }) {
  function handleChange(event) {
    const { name, value } = event.target;

    if (value !== "") {
      const numericValue = Number(value);

      if (Number.isNaN(numericValue)) {
        return;
      }

      if (numericValue < 0 || numericValue > 100) {
        return;
      }
    }

    setFilters({
      ...filters,
      [name]: value
    });
  }

  function handleClear() {
    setFilters(emptyFilters);
  }

  return (
    <div className="filter-panel" data-testid="candidate-filter-panel">
      <h2 data-testid="candidate-filter-title">Aday Nokta Filtreleri</h2>

      <p className="filter-description" data-testid="candidate-filter-description">
        Maliyet, talep ve genel skor aralıklarına göre aday noktaları filtreleyin.
      </p>

      <div className="filter-grid" data-testid="candidate-filter-grid">
        <label>
          Maliyet Skoru Min
          <input
            data-testid="filter-cost-min-input"
            type="number"
            name="costMin"
            value={filters.costMin}
            onChange={handleChange}
            min="0"
            max="100"
            placeholder="0"
          />
        </label>

        <label>
          Maliyet Skoru Max
          <input
            data-testid="filter-cost-max-input"
            type="number"
            name="costMax"
            value={filters.costMax}
            onChange={handleChange}
            min="0"
            max="100"
            placeholder="100"
          />
        </label>

        <label>
          Talep Skoru Min
          <input
            data-testid="filter-demand-min-input"
            type="number"
            name="demandMin"
            value={filters.demandMin}
            onChange={handleChange}
            min="0"
            max="100"
            placeholder="0"
          />
        </label>

        <label>
          Talep Skoru Max
          <input
            data-testid="filter-demand-max-input"
            type="number"
            name="demandMax"
            value={filters.demandMax}
            onChange={handleChange}
            min="0"
            max="100"
            placeholder="100"
          />
        </label>

        <label>
          Genel Skor Min
          <input
            data-testid="filter-general-min-input"
            type="number"
            name="generalMin"
            value={filters.generalMin}
            onChange={handleChange}
            min="0"
            max="100"
            placeholder="0"
          />
        </label>

        <label>
          Genel Skor Max
          <input
            data-testid="filter-general-max-input"
            type="number"
            name="generalMax"
            value={filters.generalMax}
            onChange={handleChange}
            min="0"
            max="100"
            placeholder="100"
          />
        </label>
      </div>

      <div className="filter-actions">
        <button
          type="button"
          className="filter-apply-button"
          data-testid="apply-score-filter-button"
          onClick={onApply}
        >
          Filtrele
        </button>

        <button
          type="button"
          className="filter-clear-button"
          data-testid="clear-score-filter-button"
          onClick={handleClear}
        >
          Temizle
        </button>
      </div>
    </div>
  );
}