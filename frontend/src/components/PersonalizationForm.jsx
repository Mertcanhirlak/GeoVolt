import React, { useState } from "react";

export default function PersonalizationForm({ candidates, onResult }) {
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
    const budgetMax = form.budgetMax === "" ? Number.MAX_SAFE_INTEGER : Number(form.budgetMax);

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
        return;
      }

      setFormMessage("Uygun aday nokta bulunamadı.");
      onResult([]);
      return;
    }

    onResult(result);
    setFormMessage("Kişiselleştirilmiş sonuçlar listelendi.");
  }

  return (
    <div className="personalization-panel">
      <h2>Kişiselleştirme Formu</h2>

      <form onSubmit={handleSubmit} className="personalization-grid">
        <label>
          Bütçe Min
          <input
            type="number"
            name="budgetMin"
            value={form.budgetMin}
            onChange={handleChange}
            placeholder="Örn: 300000"
          />
        </label>

        <label>
          Bütçe Max
          <input
            type="number"
            name="budgetMax"
            value={form.budgetMax}
            onChange={handleChange}
            placeholder="Örn: 800000"
          />
        </label>

        <label>
          Sistem Tipi
          <select
            name="systemType"
            value={form.systemType}
            onChange={handleChange}
          >
            <option value="">Seçiniz</option>
            <option value="AC">AC</option>
            <option value="DC">DC</option>
          </select>
        </label>

        <label>
          Mekân Türü
          <select
            name="placeType"
            value={form.placeType}
            onChange={handleChange}
          >
            <option value="">Seçiniz</option>
            <option value="AVM">AVM</option>
            <option value="İş Yeri">İş Yeri</option>
            <option value="Otoyol">Otoyol</option>
          </select>
        </label>

        <label>
          Bölge
          <select
            name="region"
            value={form.region}
            onChange={handleChange}
          >
            <option value="Tümü">Tümü</option>
            <option value="Kızılay">Kızılay</option>
            <option value="Söğütözü">Söğütözü</option>
            <option value="Bahçelievler">Bahçelievler</option>
            <option value="Oran">Oran</option>
            <option value="Tunalı">Tunalı</option>
          </select>
        </label>

        <button type="submit">Kişiselleştir</button>
      </form>

      {formMessage && <div className="info-message">{formMessage}</div>}
    </div>
  );
}
