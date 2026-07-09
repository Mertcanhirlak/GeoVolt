import React, { useMemo, useState } from "react";

export default function PersonalizationForm({
  candidates,
  regions,
  neighborhoods,
  onResult,
  onRegionChange
}) {
  const [form, setForm] = useState({
    budgetMin: "",
    budgetMax: "",
    systemType: "Tümü",
    placeType: "Tümü",
    region: "Tümü",
    neighborhood: "Tümü"
  });

  const [formMessage, setFormMessage] = useState("");

  const regionOptions = useMemo(() => {
    const cleanRegions = (regions || []).filter(
      (region) => region.name && region.name !== "Tümü"
    );

    return [{ id: 0, name: "Tümü" }, ...cleanRegions];
  }, [regions]);

  const systemTypeOptions = useMemo(() => {
    const values = new Set();

    candidates.forEach((candidate) => {
      if (candidate.systemType && candidate.systemType !== "Veri Eksik") {
        values.add(candidate.systemType);
      }
    });

    return ["Tümü", ...Array.from(values)];
  }, [candidates]);

  const placeTypeOptions = useMemo(() => {
    const values = new Set();

    candidates.forEach((candidate) => {
      if (candidate.placeType && candidate.placeType !== "Veri Eksik") {
        values.add(candidate.placeType);
      }
    });

    return ["Tümü", ...Array.from(values)];
  }, [candidates]);

  const neighborhoodOptions = useMemo(() => {
    const neighborhoodSet = new Set();

    if (Array.isArray(neighborhoods) && neighborhoods.length > 0) {
      neighborhoods.forEach((neighborhood) => {
        const regionMatch =
          form.region === "Tümü" || neighborhood.regionName === form.region;

        if (regionMatch && neighborhood.name) {
          neighborhoodSet.add(neighborhood.name);
        }
      });
    }

    candidates.forEach((candidate) => {
      const regionMatch =
        form.region === "Tümü" || candidate.region === form.region;

      if (
        regionMatch &&
        candidate.neighborhood &&
        candidate.neighborhood !== "Mahalle bilgisi yok"
      ) {
        neighborhoodSet.add(candidate.neighborhood);
      }
    });

    return ["Tümü", ...Array.from(neighborhoodSet).sort((a, b) =>
      a.localeCompare(b, "tr-TR")
    )];
  }, [candidates, neighborhoods, form.region]);

  function handleChange(event) {
    const { name, value } = event.target;

    let updatedForm = {
      ...form,
      [name]: value
    };

    if (name === "region") {
      updatedForm = {
        ...updatedForm,
        neighborhood: "Tümü"
      };

      if (onRegionChange) {
        const selectedRegion = regions.find((region) => region.name === value);
        onRegionChange(selectedRegion?.id || 0);
      }
    }

    setForm(updatedForm);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const budgetMin = form.budgetMin === "" ? 0 : Number(form.budgetMin);
    const budgetMax =
      form.budgetMax === "" ? Number.MAX_SAFE_INTEGER : Number(form.budgetMax);

    if (Number.isNaN(budgetMin) || Number.isNaN(budgetMax)) {
      setFormMessage("Bütçe alanlarına geçerli sayı giriniz.");
      return;
    }

    if (budgetMin < 0 || budgetMax < 0) {
      setFormMessage("Bütçe değerleri negatif olamaz.");
      return;
    }

    if (budgetMin > budgetMax) {
      setFormMessage("Minimum bütçe maksimum bütçeden büyük olamaz.");
      return;
    }

    const result = candidates.filter((candidate) => {
      const cost = candidate.estimatedCost ?? Number.MAX_SAFE_INTEGER;

      const budgetMatch = cost >= budgetMin && cost <= budgetMax;

      const systemMatch =
        form.systemType === "Tümü" || candidate.systemType === form.systemType;

      const placeMatch =
        form.placeType === "Tümü" || candidate.placeType === form.placeType;

      const regionMatch =
        form.region === "Tümü" || candidate.region === form.region;

      const neighborhoodMatch =
        form.neighborhood === "Tümü" ||
        candidate.neighborhood === form.neighborhood;

      return (
        budgetMatch &&
        systemMatch &&
        placeMatch &&
        regionMatch &&
        neighborhoodMatch
      );
    });

    if (result.length === 0) {
      const showLowScore = window.confirm(
        "Uygun aday nokta bulunamadı. Orta ve düşük skorlu adaylar gösterilsin mi?"
      );

      if (showLowScore) {
        const fallbackResult = candidates.filter((candidate) => {
          const score = candidate.generalScore ?? 0;

          const regionMatch =
            form.region === "Tümü" || candidate.region === form.region;

          const neighborhoodMatch =
            form.neighborhood === "Tümü" ||
            candidate.neighborhood === form.neighborhood;

          return score >= 20 && score <= 70 && regionMatch && neighborhoodMatch;
        });

        onResult(fallbackResult);
        setFormMessage("Orta ve düşük skorlu adaylar listelendi.");
        return;
      }

      onResult([]);
      setFormMessage("Uygun aday nokta bulunamadı.");
      return;
    }

    const sortedResult = [...result].sort((a, b) => {
      const scoreA = a.generalScore ?? 0;
      const scoreB = b.generalScore ?? 0;
      return scoreB - scoreA;
    });

    onResult(sortedResult);
    setFormMessage("Kişiselleştirilmiş sonuçlar listelendi.");
  }

  return (
    <div className="personalization-panel" data-testid="personalization-panel">
      <h2 data-testid="personalization-title">Kişiselleştirme Formu</h2>

      <form
        onSubmit={handleSubmit}
        className="personalization-grid"
        data-testid="personalization-form"
      >
        <label>
          Bütçe Min
          <input
            data-testid="personalization-budget-min-input"
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
            data-testid="personalization-budget-max-input"
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
            data-testid="personalization-system-type-select"
            name="systemType"
            value={form.systemType}
            onChange={handleChange}
          >
            {systemTypeOptions.map((systemType) => (
              <option key={systemType} value={systemType}>
                {systemType}
              </option>
            ))}
          </select>
        </label>

        <label>
          Mekân Türü
          <select
            data-testid="personalization-place-type-select"
            name="placeType"
            value={form.placeType}
            onChange={handleChange}
          >
            {placeTypeOptions.map((placeType) => (
              <option key={placeType} value={placeType}>
                {placeType}
              </option>
            ))}
          </select>
        </label>

        <label>
          Bölge
          <select
            data-testid="personalization-region-select"
            name="region"
            value={form.region}
            onChange={handleChange}
          >
            {regionOptions.map((region) => (
              <option key={region.id} value={region.name}>
                {region.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Mahalle
          <select
            data-testid="personalization-neighborhood-select"
            name="neighborhood"
            value={form.neighborhood}
            onChange={handleChange}
          >
            {neighborhoodOptions.map((neighborhood) => (
              <option key={neighborhood} value={neighborhood}>
                {neighborhood}
              </option>
            ))}
          </select>
        </label>

        <button data-testid="personalization-submit-button" type="submit">
          Kişiselleştir
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