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
    <div className="filter-panel">
      <h2>Aday Nokta Filtreleri</h2>

      <div className="filter-grid">
        <label>
          Maliyet Skoru Min
          <input
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
            type="number"
            name="generalMax"
            value={filters.generalMax}
            onChange={handleChange}
            min="0"
            max="100"
          />
        </label>
      </div>

      <button onClick={onApply}>Filtrele</button>
    </div>
  );
}
