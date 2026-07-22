import "./ManualPinPreferencesPanel.css";

const SYSTEM_TYPE_OPTIONS = [
  { value: "AC", label: "AC Şarj" },
  { value: "DC", label: "DC Hızlı Şarj" },
  { value: "AC/DC", label: "AC + DC" },
];

const PLACE_TYPE_OPTIONS = [
  "AVM",
  "Akaryakıt İstasyonu",
  "Otopark",
  "Kamu Alanı",
  "İş Merkezi",
  "Konut Bölgesi",
];

export default function ManualPinPreferencesPanel({
  selectedRegionName = "",
  values,
  error = "",
  disabled = false,
  onChange,
  onSubmit,
  onClose,
}) {
  function handleChange(event) {
    onChange?.(
      event.target.name,
      event.target.value,
    );
  }

  return (
    <aside
      className="manual-pin-preferences-panel"
      aria-labelledby="manual-pin-preferences-title"
      data-testid="manual-pin-preferences-panel"
    >
      <div className="manual-pin-preferences-header">
        <div>
          <small>Manuel Pin</small>

          <h3 id="manual-pin-preferences-title">
            Kurulum Tercihleri
          </h3>
        </div>

        <button
          type="button"
          className="manual-pin-preferences-close"
          aria-label="Kurulum tercihlerini kapat"
          data-testid="manual-pin-preferences-close-button"
          disabled={disabled}
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div
        className="manual-pin-selected-region-summary"
        data-testid="manual-pin-preferences-region"
      >
        <span>Seçili Bölge</span>
        <strong>
          {selectedRegionName || "Bölge seçilmedi"}
        </strong>
      </div>

      <form
        className="manual-pin-preferences-form"
        data-testid="manual-pin-preferences-form"
        onSubmit={onSubmit}
      >
        <label>
          <span>Sistem Tipi *</span>

          <select
            name="systemType"
            value={values.systemType}
            disabled={disabled}
            required
            data-testid="manual-pin-system-type-select"
            onChange={handleChange}
          >
            <option value="">
              Sistem tipi seçin
            </option>

            {SYSTEM_TYPE_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Mekân Tipi *</span>

          <select
            name="placeType"
            value={values.placeType}
            disabled={disabled}
            required
            data-testid="manual-pin-place-type-select"
            onChange={handleChange}
          >
            <option value="">
              Mekân tipi seçin
            </option>

            {PLACE_TYPE_OPTIONS.map((placeType) => (
              <option
                key={placeType}
                value={placeType}
              >
                {placeType}
              </option>
            ))}
          </select>
        </label>

        <div className="manual-pin-preferences-row">
          <label>
            <span>Güç (kW) *</span>

            <input
              type="number"
              name="powerKw"
              value={values.powerKw}
              min="1"
              max="1000"
              step="1"
              inputMode="numeric"
              disabled={disabled}
              required
              data-testid="manual-pin-power-input"
              onChange={handleChange}
            />
          </label>

          <label>
            <span>Konnektör *</span>

            <input
              type="number"
              name="connectorCount"
              value={values.connectorCount}
              min="1"
              max="50"
              step="1"
              inputMode="numeric"
              disabled={disabled}
              required
              data-testid="manual-pin-connector-count-input"
              onChange={handleChange}
            />
          </label>
        </div>

        <label>
          <span>Kurulum Bütçesi (TL) *</span>

          <input
            type="number"
            name="budget"
            value={values.budget}
            min="0"
            step="1000"
            inputMode="numeric"
            disabled={disabled}
            required
            placeholder="Örn. 3000000"
            data-testid="manual-pin-budget-input"
            onChange={handleChange}
          />
        </label>

        <small className="manual-pin-preferences-note">
          Tercihler kaydedildikten sonra yalnızca seçili bölge içinde nokta bırakabilirsiniz.
        </small>

        {error && (
          <div
            className="manual-pin-preferences-error"
            role="alert"
            data-testid="manual-pin-preferences-error"
          >
            {error}
          </div>
        )}

        <div className="manual-pin-preferences-actions">
          <button
            type="button"
            className="manual-pin-preferences-cancel"
            disabled={disabled}
            data-testid="manual-pin-preferences-cancel-button"
            onClick={onClose}
          >
            Vazgeç
          </button>

          <button
            type="submit"
            className="manual-pin-preferences-submit"
            disabled={disabled}
            data-testid="manual-pin-start-selection-button"
          >
            Haritada Nokta Seç
          </button>
        </div>
      </form>
    </aside>
  );
}
