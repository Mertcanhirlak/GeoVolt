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

function normalizeRelationKey(value) {
  return normalizeTextKey(value)
    .replace(
      /(mahallesi|mahalle|mah|mh)$/g,
      ""
    )
    .replace(
      /(ilcesi|ilce|semt|bolgesi|bolge)$/g,
      ""
    );
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
    selectedRegionId !== undefined &&
    String(candidate.regionId) ===
      String(selectedRegionId)
  ) {
    return true;
  }

  const candidateRegionName =
    candidate?.region ??
    candidate?.regionName;

  return (
    normalizeRelationKey(
      candidateRegionName
    ) ===
    normalizeRelationKey(
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

  const selectedRegionName =
    getRegionName(selectedRegion);

  const neighborhoodRegionId =
    getNeighborhoodRegionId(
      neighborhood
    );

  if (
    neighborhoodRegionId !== null &&
    neighborhoodRegionId !== undefined &&
    selectedRegionId !== null &&
    selectedRegionId !== undefined &&
    String(neighborhoodRegionId) ===
      String(selectedRegionId)
  ) {
    return true;
  }

  const neighborhoodRegionName =
    getNeighborhoodRegionName(
      neighborhood
    );

  if (
    neighborhoodRegionName &&
    normalizeRelationKey(
      neighborhoodRegionName
    ) ===
      normalizeRelationKey(
        selectedRegionName
      )
  ) {
    return true;
  }

  /*
   * Haritadaki seçili polygon doğrudan mahalleyi
   * temsil ediyorsa mahalle adı ile bölge adını eşleştirir.
   */
  return (
    normalizeRelationKey(
      getNeighborhoodName(neighborhood)
    ) ===
    normalizeRelationKey(
      selectedRegionName
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
    selectedNeighborhoodId !== undefined &&
    String(
      candidate.neighborhoodId
    ) ===
      String(
        selectedNeighborhoodId
      )
  ) {
    return true;
  }

  return (
    normalizeRelationKey(
      candidate?.neighborhood ??
        candidate?.neighborhoodName
    ) ===
    normalizeRelationKey(
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
          `neighborhood-${normalizeRelationKey(
            name
          )}-${index}`;

        const key =
          normalizeRelationKey(name);

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
    isRegionDropdownOpen,
    setIsRegionDropdownOpen,
  ] = useState(false);

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

      regionMap.set("0", {
        id: 0,
        name: "Tümü",
      });

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
        new Set([
          "AC",
          "DC",
        ]);

      candidates.forEach(
        (candidate) => {
          const systemType =
            String(
              candidate?.systemType ??
                "",
            )
              .trim()
              .toUpperCase();

          if (
            systemType === "AC" ||
            systemType === "DC"
          ) {
            values.add(
              systemType,
            );
          }
        },
      );

      return [
        "Tümü",
        ...Array.from(
          values,
        ),
      ];
    }, [candidates]);

  const placeTypeOptions =
    useMemo(() => {
      const values =
        new Set([
          "İş Yeri",
          "AVM",
          "Otopark",
          "Akaryakıt İstasyonu",
          "Kamu Alanı",
          "Hastane",
          "Üniversite",
        ]);

      candidates.forEach(
        (candidate) => {
          const placeType =
            String(
              candidate?.placeType ??
                "",
            ).trim();

          if (
            placeType &&
            placeType !==
              "Veri Eksik" &&
            placeType !==
              "Belirtilmedi" &&
            placeType !==
              "Tümü"
          ) {
            values.add(
              placeType,
            );
          }
        },
      );

      return [
        "Tümü",
        ...Array.from(
          values,
        ),
      ];
    }, [candidates]);

  /*
   * Parent componentten mahalle verisi geliyorsa yalnızca
   * gerçek bölge ilişkisi bulunan kayıtlar kullanılır.
   */
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

  /*
   * Aday noktaların içinden mahalle türetilmez.
   * Dropdown yalnızca doğrulanmış GeoJSON veya parent
   * componentten gelen gerçek mahalle kayıtlarını gösterir.
   */
  const neighborhoodOptions =
    useMemo(
      () =>
        mergeNeighborhoodOptions([
          loadedNeighborhoods,
          providedNeighborhoods,
        ]),
      [
        loadedNeighborhoods,
        providedNeighborhoods,
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
        "Seçilen bölgenin gerçek mahalleleri yükleniyor..."
      );

      try {
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
            result?.data
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
              `${safeNeighborhoods.length} gerçek mahalle eşleşmesi bulundu.`
          );

          return;
        }

        if (result?.error) {
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
          result?.message ||
            "Seçilen bölge için doğrulanmış mahalle eşleşmesi bulunamadı."
        );
      } catch (error) {
        if (
          !isMounted ||
          neighborhoodRequestIdRef.current !==
            requestId
        ) {
          return;
        }

        console.error(
          "Mahalleler yüklenemedi:",
          error
        );

        setLoadedNeighborhoods(
          []
        );

        setNeighborhoodStatus(
          "error"
        );

        setNeighborhoodMessage(
          "Mahalle verileri yüklenirken beklenmeyen bir hata oluştu."
        );
      }
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
   * Bölge değiştiğinde önceki bölgeden kalan geçersiz
   * mahalle seçimini temizler.
   *
   * Yalnızca tek gerçek mahalle eşleşmesi bulunursa
   * bu mahalle otomatik seçilir.
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

    const selectedNeighborhoodExists =
      neighborhoodOptions.some(
        (neighborhood) =>
          String(
            neighborhood.id
          ) ===
          String(
            form.neighborhoodId
          )
      );

    if (
      form.neighborhoodId !==
        "0" &&
      !selectedNeighborhoodExists
    ) {
      const updatedForm = {
        ...form,
        neighborhoodId: "0",
        neighborhood: "Tümü",
      };

      setForm(updatedForm);

      notifySelectionChange(
        updatedForm
      );

      return;
    }

    if (
      neighborhoodOptions.length !==
        1 ||
      form.neighborhoodId !== "0"
    ) {
      return;
    }

    const onlyNeighborhood =
      neighborhoodOptions[0];

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
          ? "Seçilen bölgenin gerçek mahalleleri yükleniyor..."
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

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();

    notifySelectionChange(
      form,
    );

    const hasMinimumBudget =
      form.budgetMin !== "";

    const hasMaximumBudget =
      form.budgetMax !== "";

    const budgetMin =
      hasMinimumBudget
        ? Number(
            form.budgetMin,
          )
        : 0;

    const budgetMax =
      hasMaximumBudget
        ? Number(
            form.budgetMax,
          )
        : Number.MAX_SAFE_INTEGER;

    if (
      Number.isNaN(
        budgetMin,
      ) ||
      Number.isNaN(
        budgetMax,
      )
    ) {
      setFormMessage(
        "Bütçe alanlarına geçerli sayı giriniz.",
      );

      return;
    }

    if (
      budgetMin < 0 ||
      budgetMax < 0
    ) {
      setFormMessage(
        "Bütçe değerleri negatif olamaz.",
      );

      return;
    }

    if (
      budgetMin >
      budgetMax
    ) {
      setFormMessage(
        "Minimum bütçe maksimum bütçeden büyük olamaz.",
      );

      return;
    }

    if (
      typeof onResult !==
      "function"
    ) {
      setFormMessage(
        "Gerçek aday sorgusu başlatılamadı.",
      );

      return;
    }

    setFormMessage(
      "Gerçek aday noktalar backend üzerinden getiriliyor...",
    );

    try {
      const response =
        await onResult({
          regionId:
            form.regionId,

          region:
            form.region,

          neighborhoodId:
            form.neighborhoodId,

          neighborhood:
            form.neighborhood,

          systemType:
            form.systemType,

          placeType:
            form.placeType,

          budgetMin:
            hasMinimumBudget
              ? budgetMin
              : "",

          budgetMax:
            hasMaximumBudget
              ? budgetMax
              : "",
        });

      setFormMessage(
        response?.message ||
          "Kişiselleştirme sorgusu tamamlandı.",
      );
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : "Kişiselleştirme sorgusu sırasında hata oluştu.",
      );
    }
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

          <div
  className="personalization-custom-select"
  onBlur={(event) => {
    if (
      !event.currentTarget.contains(
        event.relatedTarget,
      )
    ) {
      setIsRegionDropdownOpen(false);
    }
  }}
>
  <button
    type="button"
    className="personalization-custom-select-trigger"
    data-testid="personalization-region-select"
    aria-haspopup="listbox"
    aria-expanded={
      isRegionDropdownOpen
    }
    onClick={(event) => {
      event.preventDefault();

      setIsRegionDropdownOpen(
        (currentValue) =>
          !currentValue,
      );
    }}
  >
    <span>
      {regionOptions.find(
        (region) =>
          String(region.id) ===
          String(form.regionId),
      )?.name ?? "Tümü"}
    </span>

    <span
      className={`personalization-custom-select-arrow ${
        isRegionDropdownOpen
          ? "is-open"
          : ""
      }`}
      aria-hidden="true"
    >
      ▾
    </span>
  </button>

  {isRegionDropdownOpen ? (
    <div
      className="personalization-custom-select-menu"
      role="listbox"
      data-testid="personalization-region-options"
    >
      {regionOptions.map(
        (region) => {
          const optionValue =
            String(region.id);

          const isSelected =
            optionValue ===
            String(form.regionId);

          return (
            <button
              key={
                optionValue
              }
              type="button"
              role="option"
              aria-selected={
                isSelected
              }
              className={`personalization-custom-select-option ${
                isSelected
                  ? "is-selected"
                  : ""
              }`}
              data-testid={`personalization-region-option-${optionValue}`}
              onClick={(event) => {
                event.preventDefault();

                handleChange({
                  target: {
                    name:
                      "regionId",

                    value:
                      optionValue,
                  },
                });

                setIsRegionDropdownOpen(
                  false,
                );
              }}
            >
              {region.name}
            </button>
          );
        },
      )}
    </div>
  ) : null}
</div>
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