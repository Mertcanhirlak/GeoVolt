import React, { useState } from "react";

export default function PersonalizationForm({ candidates, onResult, onShowOnMap }) {
  const [form, setForm] = useState({
    budgetMin: "",
    budgetMax: "",
    systemType: "",
    placeType: "",
    region: "Tümü"
  });

  const [formMessage, setFormMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm({
      ...form,
      [name]: value
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    const budgetMin = form.budgetMin === "" ? 0 : Number(form.budgetMin);
    const budgetMax =
      form.budgetMax === "" ? Number.MAX_SAFE_INTEGER : Number(form.budgetMax);

    if (budgetMin < 0 || budgetMax < 0) {
      setFormMessage("Bütçe değerleri negatif olamaz.");
      return;
    }

    if (budgetMin > budgetMax) {
      setFormMessage("Minimum bütçe maksimum bütçeden büyük olamaz.");
      return;
    }

    if (!form.systemType) {
      setFormMessage("Lütfen sistem tipini seçiniz.");
      return;
    }

    if (!form.placeType) {
      setFormMessage("Lütfen mekân türünü seçiniz.");
      return;
    }

    const result = candidates.filter((candidate) => {
      const cost = candidate.estimatedCost ?? Number.MAX_SAFE_INTEGER;

      const budgetMatch = cost >= budgetMin && cost <= budgetMax;
      const systemMatch = candidate.systemType === form.systemType;
      const placeMatch = candidate.placeType === form.placeType;
      const regionMatch = form.region === "Tümü" || candidate.region === form.region;

      return budgetMatch && systemMatch && placeMatch && regionMatch;
    });

    if (result.length === 0) {
      const showLowScore = window.confirm(
        "Uygun aday nokta bulunamadı. Orta ve düşük skorlu adaylar gösterilsin mi?"
      );

      if (showLowScore) {
        const fallbackResult = candidates.filter((candidate) => {
          const score = candidate.generalScore ?? 0;
          return score >= 20 && score <= 70;
        });

        onResult(fallbackResult);
        setFormMessage("Orta ve düşük skorlu adaylar gösteriliyor.");

        if (fallbackResult.length > 0 && onShowOnMap) {
          onShowOnMap(fallbackResult);
        }

        return;
      }

      setFormMessage("Uygun aday nokta bulunamadı.");
      onResult([]);
      return;
    }

    onResult(result);
    setFormMessage("Kişiselleştirilmiş aday noktalar haritada gösteriliyor.");

    if (onShowOnMap) {
      onShowOnMap(result);
    }
  }

  return (
    <div className="personalization-map-panel" data-testid="personalization-panel">
      <h2 data-testid="personalization-title">Kişiselleştirme Formu</h2>

      <form
        onSubmit={handleSubmit}
        className="personalization-map-form"
        data-testid="personalization-form"
      >
        <div className="form-section">
          <p>Lütfen şirketinizin belirlediği bütçe aralığını giriniz.</p>

          <div className="budget-row">
            <input
              data-testid="personalization-budget-min-input"
              type="number"
              name="budgetMin"
              value={form.budgetMin}
              onChange={handleChange}
              placeholder="Min"
            />

            <input
              data-testid="personalization-budget-max-input"
              type="number"
              name="budgetMax"
              value={form.budgetMax}
              onChange={handleChange}
              placeholder="Max"
            />

            <span className="currency-symbol">₺</span>
          </div>
        </div>

        <div className="form-section">
          <p>Yatırım yapmayı hedeflediğiniz şarj sistemi tipini seçiniz.</p>

          <div className="radio-row">
            <label>
              <input
                data-testid="personalization-system-ac-radio"
                type="radio"
                name="systemType"
                value="AC"
                checked={form.systemType === "AC"}
                onChange={handleChange}
              />
              AC
            </label>

            <label>
              <input
                data-testid="personalization-system-dc-radio"
                type="radio"
                name="systemType"
                value="DC"
                checked={form.systemType === "DC"}
                onChange={handleChange}
              />
              DC
            </label>
          </div>
        </div>

        <div className="form-section">
          <p>Şarj istasyonu kuracağınız mekân türünü seçiniz.</p>

          <div className="radio-row place-row">
            <label>
              <input
                data-testid="personalization-place-highway-radio"
                type="radio"
                name="placeType"
                value="Otoyol"
                checked={form.placeType === "Otoyol"}
                onChange={handleChange}
              />
              Otoyol
            </label>

            <label>
              <input
                data-testid="personalization-place-workplace-radio"
                type="radio"
                name="placeType"
                value="İş Yeri"
                checked={form.placeType === "İş Yeri"}
                onChange={handleChange}
              />
              İş yeri
            </label>

            <label>
              <input
                data-testid="personalization-place-mall-radio"
                type="radio"
                name="placeType"
                value="AVM"
                checked={form.placeType === "AVM"}
                onChange={handleChange}
              />
              AVM
            </label>
          </div>
        </div>

        <div className="form-section">
          <p>Semt belirleyiniz</p>

          <select
            data-testid="personalization-region-select"
            name="region"
            value={form.region}
            onChange={handleChange}
          >
            <option value="Tümü">Tümü</option>
            <option value="Çayyolu">Çayyolu</option>
            <option value="Söğütözü">Söğütözü</option>
            <option value="Ahlatlıbel">Ahlatlıbel</option>
            <option value="Kızılay">Kızılay</option>
            <option value="Bahçelievler">Bahçelievler</option>
            <option value="Oran">Oran</option>
            <option value="Tunalı">Tunalı</option>
          </select>
        </div>

        <button data-testid="personalization-submit-button" type="submit">
          Haritada Göster
        </button>
      </form>

      {formMessage && (
        <div className="info-message" data-testid="personalization-message">
          {formMessage}
        </div>
      )}
    </div>
  );
}
