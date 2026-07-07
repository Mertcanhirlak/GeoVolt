import React from "react";

export default function CandidateFilters({ filters, setFilters, onApply }) {
  function handleChange(event) {
    const { name, value } = event.target;

    setFilters({
      ...filters,
      [name]: value
    });
  }

  return (
    <div className="filter-panel" data-testid="candidate-filter-panel">
      <h2 data-testid="candidate-filter-title">Aday Nokta Filtreleri</h2>

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
          />
        </label>
      </div>

      <button data-testid="apply-score-filter-button" onClick={onApply}>
        Filtrele
      </button>
    </div>
  );
}
