import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getNeighborhoods,
} from "../services/regionsApi";

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeTextKey(value) {
  return normalizeText(value)
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]/g, "");
}

function getRegionId(region) {
  return (
    region?.id ??
    region?.Id ??
    region?.ID ??
    region?.regionId ??
    region?.RegionId ??
    null
  );
}

function getRegionName(region) {
  return normalizeText(
    region?.name ??
      region?.Name ??
      region?.NAME ??
      region?.regionName ??
      region?.RegionName
  );
}

function getNeighborhoodId(neighborhood) {
  return (
    neighborhood?.id ??
    neighborhood?.Id ??
    neighborhood?.ID ??
    neighborhood?.neighborhoodId ??
    neighborhood?.NeighborhoodId ??
    null
  );
}

function getNeighborhoodName(neighborhood) {
  return normalizeText(
    neighborhood?.name ??
      neighborhood?.Name ??
      neighborhood?.NAME ??
      neighborhood?.neighborhood ??
      neighborhood?.Neighborhood ??
      neighborhood?.neighborhoodName ??
      neighborhood?.NeighborhoodName
  );
}

function getNeighborhoodRegionId(
  neighborhood
) {
  return (
    neighborhood?.regionId ??
    neighborhood?.RegionId ??
    neighborhood?.REGION_ID ??
    null
  );
}

function getNeighborhoodRegionName(
  neighborhood
) {
  return normalizeText(
    neighborhood?.regionName ??
      neighborhood?.RegionName ??
      neighborhood?.REGION_NAME
  );
}

function candidateMatchesRegion(
  candidate,
  selectedRegion
) {
  if (!selectedRegion) {
    return true;
  }

  const selectedRegionId =
    getRegionId(selectedRegion);

  if (
    candidate?.regionId !== null &&
    candidate?.regionId !== undefined &&
    selectedRegionId !== null &&
    selectedRegionId !== undefined
  ) {
    return (
      String(candidate.regionId) ===
      String(selectedRegionId)
    );
  }

  return (
    normalizeTextKey(
      candidate?.region ??
        candidate?.regionName
    ) ===
    normalizeTextKey(
      getRegionName(selectedRegion)
    )
  );
}

function neighborhoodMatchesRegion(
  neighborhood,
  selectedRegion
) {
  if (!selectedRegion) {
    return false;
  }

  const selectedRegionId =
    getRegionId(selectedRegion);

  const neighborhoodRegionId =
    getNeighborhoodRegionId(
      neighborhood
    );

  if (
    neighborhoodRegionId !== null &&
    neighborhoodRegionId !== undefined &&
    selectedRegionId !== null &&
    selectedRegionId !== undefined
  ) {
    return (
      String(neighborhoodRegionId) ===
      String(selectedRegionId)
    );
  }

  const neighborhoodRegionName =
    getNeighborhoodRegionName(
      neighborhood
    );

  if (!neighborhoodRegionName) {
    return false;
  }

  return (
    normalizeTextKey(
      neighborhoodRegionName
    ) ===
    normalizeTextKey(
      getRegionName(selectedRegion)
    )
  );
}

function candidateMatchesNeighborhood(
  candidate,
  selectedNeighborhood
) {
  if (!selectedNeighborhood) {
    return true;
  }

  const selectedNeighborhoodId =
    getNeighborhoodId(
      selectedNeighborhood
    );

  if (
    candidate?.neighborhoodId !== null &&
    candidate?.neighborhoodId !==
      undefined &&
    selectedNeighborhoodId !== null &&
    selectedNeighborhoodId !== undefined
  ) {
    return (
      String(
        candidate.neighborhoodId
      ) ===
      String(
        selectedNeighborhoodId
      )
    );
  }

  return (
    normalizeTextKey(
      candidate?.neighborhood ??
        candidate?.neighborhoodName
    ) ===
    normalizeTextKey(
      getNeighborhoodName(
        selectedNeighborhood
      )
    )
  );
}

function mergeNeighborhoodOptions(
  neighborhoodGroups
) {
  const neighborhoodMap =
    new Map();

  neighborhoodGroups
    .flat()
    .forEach(
      (
        neighborhood,
        index
      ) => {
        const name =
          getNeighborhoodName(
            neighborhood
          );

        if (!name) {
          return;
        }

        const rawId =
          getNeighborhoodId(
            neighborhood
          );

        const id =
          rawId ??
          `neighborhood-${normalizeTextKey(
            name
          )}-${index}`;

        const key =
          normalizeTextKey(name);

        if (
          !neighborhoodMap.has(
            key
          )
        ) {
          neighborhoodMap.set(
            key,
            {
              ...neighborhood,
              id,
              name,
            }
          );
        }
      }
    );

  return Array.from(
    neighborhoodMap.values()
  ).sort(
    (
      firstNeighborhood,
      secondNeighborhood
    ) =>
      firstNeighborhood.name.localeCompare(
        secondNeighborhood.name,
        "tr-TR"
      )
  );
}

export default function PersonalizationForm({
  candidates = [],
  regions = [],
  neighborhoods = [],
  onResult,
  onRegionChange,
  onSelectionChange,
}) {
  const neighborhoodRequestIdRef =
    useRef(0);

  const onSelectionChangeRef =
    useRef(onSelectionChange);

  useEffect(() => {
    onSelectionChangeRef.current =
      onSelectionChange;
  }, [onSelectionChange]);

  const [form, setForm] =
    useState({
      budgetMin: "",
      budgetMax: "",

      systemType: "Tümü",
      placeType: "Tümü",

      regionId: "0",
      region: "Tümü",

      neighborhoodId: "0",
      neighborhood: "Tümü",
    });

  const [
    formMessage,
    setFormMessage,
  ] = useState("");

  const [
    loadedNeighborhoods,
    setLoadedNeighborhoods,
  ] = useState([]);

  const [
    neighborhoodStatus,
    setNeighborhoodStatus,
  ] = useState("idle");

  const [
    neighborhoodMessage,
    setNeighborhoodMessage,
  ] = useState(
    "Mahalle seçmek için önce bir bölge seçin."
  );

  const regionOptions =
    useMemo(() => {
      const regionMap =
        new Map();

      regionMap.set(
        "0",
        {
          id: 0,
          name: "Tümü",
        }
      );

      regions.forEach(
        (region) => {
          const id =
            getRegionId(region);

          const name =
            getRegionName(region);

          if (
            id === null ||
            id === undefined ||
            Number(id) === 0 ||
            !name ||
            name === "Tümü"
          ) {
            return;
          }

          regionMap.set(
            String(id),
            {
              ...region,
              id,
              name,
            }
          );
        }
      );

      return Array.from(
        regionMap.values()
      ).sort(
        (
          firstRegion,
          secondRegion
        ) => {
          if (
            Number(
              firstRegion.id
            ) === 0
          ) {
            return -1;
          }

          if (
            Number(
              secondRegion.id
            ) === 0
          ) {
            return 1;
          }

          return firstRegion.name.localeCompare(
            secondRegion.name,
            "tr-TR"
          );
        }
      );
    }, [regions]);

  const selectedRegion =
    useMemo(
      () =>
        regionOptions.find(
          (region) =>
            String(region.id) ===
            String(form.regionId)
        ) ?? null,
      [
        regionOptions,
        form.regionId,
      ]
    );

  const systemTypeOptions =
    useMemo(() => {
      const values =
        new Set();

      candidates.forEach(
        (candidate) => {
          if (
            candidate.systemType &&
            candidate.systemType !==
              "Veri Eksik" &&
            candidate.systemType !==
              "Belirtilmedi"
          ) {
            values.add(
              candidate.systemType
            );
          }
        }
      );

      return [
        "Tümü",
        ...Array.from(values).sort(
          (first, second) =>
            first.localeCompare(
              second,
              "tr-TR"
            )
        ),
      ];
    }, [candidates]);

  const placeTypeOptions =
    useMemo(() => {
      const values =
        new Set();

      candidates.forEach(
        (candidate) => {
          if (
            candidate.placeType &&
            candidate.placeType !==
              "Veri Eksik" &&
            candidate.placeType !==
              "Belirtilmedi"
          ) {
            values.add(
              candidate.placeType
            );
          }
        }
      );

      return [
        "Tümü",
        ...Array.from(values).sort(
          (first, second) =>
            first.localeCompare(
              second,
              "tr-TR"
            )
        ),
      ];
    }, [candidates]);

  const providedNeighborhoods =
    useMemo(() => {
      if (
        !selectedRegion ||
        Number(
          getRegionId(
            selectedRegion
          )
        ) === 0
      ) {
        return [];
      }

      return neighborhoods.filter(
        (neighborhood) =>
          neighborhoodMatchesRegion(
            neighborhood,
            selectedRegion
          )
      );
    }, [
      neighborhoods,
      selectedRegion,
    ]);

  const candidateNeighborhoods =
    useMemo(() => {
      if (
        !selectedRegion ||
        Number(
          getRegionId(
            selectedRegion
          )
        ) === 0
      ) {
        return [];
      }

      return candidates
        .filter((candidate) =>
          candidateMatchesRegion(
            candidate,
            selectedRegion
          )
        )
        .map(
          (
            candidate,
            index
          ) => {
            const name =
              normalizeText(
                candidate.neighborhood ??
                  candidate.neighborhoodName
              );

            if (
              !name ||
              name ===
                "Mahalle bilgisi yok"
            ) {
              return null;
            }

            return {
              id:
                candidate.neighborhoodId ??
                `candidate-neighborhood-${index}-${normalizeTextKey(
                  name
                )}`,

              name,

              regionId:
                candidate.regionId ??
                getRegionId(
                  selectedRegion
                ),

              regionName:
                candidate.region ??
                candidate.regionName ??
                getRegionName(
                  selectedRegion
                ),

              source:
                "candidate",
            };
          }
        )
        .filter(Boolean);
    }, [
      candidates,
      selectedRegion,
    ]);

  const neighborhoodOptions =
    useMemo(
      () =>
        mergeNeighborhoodOptions(
          [
            loadedNeighborhoods,
            providedNeighborhoods,
            candidateNeighborhoods,
          ]
        ),
      [
        loadedNeighborhoods,
        providedNeighborhoods,
        candidateNeighborhoods,
      ]
    );

  function notifySelectionChange(
    updatedForm
  ) {
    onSelectionChangeRef.current?.({
      regionId:
        updatedForm.regionId,

      region:
        updatedForm.region,

      neighborhoodId:
        updatedForm.neighborhoodId,

      neighborhood:
        updatedForm.neighborhood,

      systemType:
        updatedForm.systemType,

      placeType:
        updatedForm.placeType,

      budgetMin:
        updatedForm.budgetMin,

      budgetMax:
        updatedForm.budgetMax,
    });
  }

  useEffect(() => {
    neighborhoodRequestIdRef.current +=
      1;

    const requestId =
      neighborhoodRequestIdRef.current;

    const selectedRegionId =
      Number(form.regionId);

    if (
      !Number.isInteger(
        selectedRegionId
      ) ||
      selectedRegionId <= 0
    ) {
      setLoadedNeighborhoods(
        []
      );

      setNeighborhoodStatus(
        "idle"
      );

      setNeighborhoodMessage(
        "Mahalle seçmek için önce bir bölge seçin."
      );

      return;
    }

    let isMounted = true;

    async function loadNeighborhoods() {
      setNeighborhoodStatus(
        "loading"
      );

      setNeighborhoodMessage(
        "Seçilen bölgenin mahalleleri yükleniyor..."
      );

      const result =
        await getNeighborhoods(
          selectedRegionId,
          getRegionName(
            selectedRegion
          )
        );

      if (
        !isMounted ||
        neighborhoodRequestIdRef.current !==
          requestId
      ) {
        return;
      }

      const safeNeighborhoods =
        Array.isArray(
          result.data
        )
          ? result.data
          : [];

      setLoadedNeighborhoods(
        safeNeighborhoods
      );

      if (
        safeNeighborhoods.length >
        0
      ) {
        setNeighborhoodStatus(
          "ready"
        );

        setNeighborhoodMessage(
          result.message ||
            `${safeNeighborhoods.length} mahalle getirildi.`
        );

        return;
      }

      if (result.error) {
        setNeighborhoodStatus(
          "error"
        );

        setNeighborhoodMessage(
          result.error
        );

        return;
      }

      setNeighborhoodStatus(
        "empty"
      );

      setNeighborhoodMessage(
        result.message ||
          "Seçilen bölge için doğrulanmış mahalle eşlemesi bulunamadı."
      );
    }

    loadNeighborhoods();

    return () => {
      isMounted = false;
    };
  }, [
    form.regionId,
    selectedRegion,
  ]);

  /*
   * Seçilen bölgeye yalnızca tek mahalle bağlıysa
   * mahalleyi otomatik seçer.
   *
   * Kızılırmak gibi mahalle seviyesindeki polygonlarda
   * dropdown artık "Tümü" değerinde kalmaz.
   */
  useEffect(() => {
    const selectedRegionId =
      Number(form.regionId);

    if (
      !Number.isInteger(
        selectedRegionId
      ) ||
      selectedRegionId <= 0 ||
      neighborhoodStatus ===
        "loading"
    ) {
      return;
    }

    if (
      neighborhoodOptions.length ===
      0
    ) {
      if (
        form.neighborhoodId !==
        "0"
      ) {
        const updatedForm = {
          ...form,

          neighborhoodId:
            "0",

          neighborhood:
            "Tümü",
        };

        setForm(updatedForm);

        notifySelectionChange(
          updatedForm
        );
      }

      return;
    }

    if (
      neighborhoodOptions.length !==
      1
    ) {
      return;
    }

    const onlyNeighborhood =
      neighborhoodOptions[0];

    if (
      String(
        form.neighborhoodId
      ) ===
      String(
        onlyNeighborhood.id
      )
    ) {
      return;
    }

    const updatedForm = {
      ...form,

      neighborhoodId:
        String(
          onlyNeighborhood.id
        ),

      neighborhood:
        onlyNeighborhood.name,
    };

    setForm(updatedForm);

    setNeighborhoodMessage(
      `${onlyNeighborhood.name} otomatik seçildi.`
    );

    notifySelectionChange(
      updatedForm
    );
  }, [
    neighborhoodOptions,
    neighborhoodStatus,
    form,
  ]);

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    if (name === "regionId") {
      const selectedOption =
        regionOptions.find(
          (region) =>
            String(region.id) ===
            String(value)
        );

      const updatedForm = {
        ...form,

        regionId:
          String(value),

        region:
          selectedOption?.name ??
          "Tümü",

        neighborhoodId:
          "0",

        neighborhood:
          "Tümü",
      };

      setForm(updatedForm);
      setFormMessage("");

      setLoadedNeighborhoods(
        []
      );

      setNeighborhoodStatus(
        Number(value) > 0
          ? "loading"
          : "idle"
      );

      setNeighborhoodMessage(
        Number(value) > 0
          ? "Seçilen bölgenin mahalleleri yükleniyor..."
          : "Mahalle seçmek için önce bir bölge seçin."
      );

      onRegionChange?.(
        Number(value) || 0
      );

      notifySelectionChange(
        updatedForm
      );

      return;
    }

    if (
      name ===
      "neighborhoodId"
    ) {
      const selectedOption =
        neighborhoodOptions.find(
          (neighborhood) =>
            String(
              neighborhood.id
            ) ===
            String(value)
        );

      const updatedForm = {
        ...form,

        neighborhoodId:
          String(value),

        neighborhood:
          String(value) === "0"
            ? "Tümü"
            : selectedOption?.name ??
              "Tümü",
      };

      setForm(updatedForm);
      setFormMessage("");

      notifySelectionChange(
        updatedForm
      );

      return;
    }

    const updatedForm = {
      ...form,
      [name]: value,
    };

    setForm(updatedForm);
    setFormMessage("");

    notifySelectionChange(
      updatedForm
    );
  }

  function handleSubmit(event) {
    event.preventDefault();

    notifySelectionChange(
      form
    );

    const hasMinimumBudget =
      form.budgetMin !== "";

    const hasMaximumBudget =
      form.budgetMax !== "";

    const budgetMin =
      hasMinimumBudget
        ? Number(form.budgetMin)
        : 0;

    const budgetMax =
      hasMaximumBudget
        ? Number(form.budgetMax)
        : Number.MAX_SAFE_INTEGER;

    if (
      Number.isNaN(budgetMin) ||
      Number.isNaN(budgetMax)
    ) {
      setFormMessage(
        "Bütçe alanlarına geçerli sayı giriniz."
      );

      return;
    }

    if (
      budgetMin < 0 ||
      budgetMax < 0
    ) {
      setFormMessage(
        "Bütçe değerleri negatif olamaz."
      );

      return;
    }

    if (
      budgetMin >
      budgetMax
    ) {
      setFormMessage(
        "Minimum bütçe maksimum bütçeden büyük olamaz."
      );

      return;
    }

    const selectedNeighborhood =
      form.neighborhoodId ===
      "0"
        ? null
        : neighborhoodOptions.find(
            (neighborhood) =>
              String(
                neighborhood.id
              ) ===
              String(
                form.neighborhoodId
              )
          ) ?? null;

    const hasBudgetFilter =
      hasMinimumBudget ||
      hasMaximumBudget;

    const result =
      candidates.filter(
        (candidate) => {
          const numericCost =
            Number(
              candidate.estimatedCost
            );

          const budgetMatch =
            !hasBudgetFilter ||
            (
              Number.isFinite(
                numericCost
              ) &&
              numericCost >=
                budgetMin &&
              numericCost <=
                budgetMax
            );

          const systemMatch =
            form.systemType ===
              "Tümü" ||
            candidate.systemType ===
              form.systemType;

          const placeMatch =
            form.placeType ===
              "Tümü" ||
            candidate.placeType ===
              form.placeType;

          const regionMatch =
            form.regionId ===
              "0" ||
            candidateMatchesRegion(
              candidate,
              selectedRegion
            );

          const neighborhoodMatch =
            form.neighborhoodId ===
              "0" ||
            candidateMatchesNeighborhood(
              candidate,
              selectedNeighborhood
            );

          return (
            budgetMatch &&
            systemMatch &&
            placeMatch &&
            regionMatch &&
            neighborhoodMatch
          );
        }
      );

    const sortedResult = [
      ...result,
    ].sort(
      (
        firstCandidate,
        secondCandidate
      ) => {
        const firstScore =
          firstCandidate.generalScore ??
          0;

        const secondScore =
          secondCandidate.generalScore ??
          0;

        return (
          secondScore -
          firstScore
        );
      }
    );

    onResult?.(
      sortedResult
    );

    if (
      sortedResult.length ===
      0
    ) {
      setFormMessage(
        "Seçilen gerçek bölge ve mahalle ölçütlerine uygun aday nokta bulunamadı."
      );

      return;
    }

    setFormMessage(
      `${sortedResult.length} kişiselleştirilmiş aday nokta listelendi.`
    );
  }

  const regionSelected =
    Number(
      form.regionId
    ) > 0;

  const neighborhoodDisabled =
    !regionSelected ||
    (
      neighborhoodStatus ===
        "loading" &&
      neighborhoodOptions.length ===
        0
    ) ||
    neighborhoodOptions.length ===
      0;

  let neighborhoodFirstOption =
    "Tümü";

  if (!regionSelected) {
    neighborhoodFirstOption =
      "Önce bölge seçin";
  } else if (
    neighborhoodStatus ===
      "loading" &&
    neighborhoodOptions.length ===
      0
  ) {
    neighborhoodFirstOption =
      "Mahalleler yükleniyor...";
  } else if (
    neighborhoodOptions.length ===
    0
  ) {
    neighborhoodFirstOption =
      "Eşleşen mahalle yok";
  }

  return (
    <div
      className="personalization-panel"
      data-testid="personalization-panel"
    >
      <h2
        data-testid="personalization-title"
      >
        Kişiselleştirme Formu
      </h2>

      <form
        onSubmit={
          handleSubmit
        }
        className="personalization-grid"
        data-testid="personalization-form"
      >
        <label>
          Bütçe Min

          <input
            data-testid="personalization-budget-min-input"
            type="number"
            name="budgetMin"
            min="0"
            value={
              form.budgetMin
            }
            onChange={
              handleChange
            }
            placeholder="Örn: 300000"
          />
        </label>

        <label>
          Bütçe Max

          <input
            data-testid="personalization-budget-max-input"
            type="number"
            name="budgetMax"
            min="0"
            value={
              form.budgetMax
            }
            onChange={
              handleChange
            }
            placeholder="Örn: 800000"
          />
        </label>

        <label>
          Sistem Tipi

          <select
            data-testid="personalization-system-type-select"
            name="systemType"
            value={
              form.systemType
            }
            onChange={
              handleChange
            }
          >
            {systemTypeOptions.map(
              (systemType) => (
                <option
                  key={
                    systemType
                  }
                  value={
                    systemType
                  }
                >
                  {systemType}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          Mekân Türü

          <select
            data-testid="personalization-place-type-select"
            name="placeType"
            value={
              form.placeType
            }
            onChange={
              handleChange
            }
          >
            {placeTypeOptions.map(
              (placeType) => (
                <option
                  key={
                    placeType
                  }
                  value={
                    placeType
                  }
                >
                  {placeType}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          Bölge

          <select
            data-testid="personalization-region-select"
            name="regionId"
            value={
              form.regionId
            }
            onChange={
              handleChange
            }
          >
            {regionOptions.map(
              (region) => (
                <option
                  key={
                    region.id
                  }
                  value={
                    String(
                      region.id
                    )
                  }
                >
                  {region.name}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          Mahalle

          <select
            data-testid="personalization-neighborhood-select"
            name="neighborhoodId"
            value={
              form.neighborhoodId
            }
            onChange={
              handleChange
            }
            disabled={
              neighborhoodDisabled
            }
          >
            <option value="0">
              {
                neighborhoodFirstOption
              }
            </option>

            {neighborhoodOptions.map(
              (neighborhood) => (
                <option
                  key={
                    neighborhood.id
                  }
                  value={
                    String(
                      neighborhood.id
                    )
                  }
                >
                  {
                    neighborhood.name
                  }
                </option>
              )
            )}
          </select>

          <small
            data-testid="personalization-neighborhood-status"
          >
            {
              neighborhoodMessage
            }
          </small>
        </label>

        <button
          data-testid="personalization-submit-button"
          type="submit"
        >
          Kişiselleştir
        </button>
      </form>

      {formMessage && (
        <div
          className="info-message"
          data-testid="personalization-message"
        >
          {formMessage}
        </div>
      )}
    </div>
  );
}