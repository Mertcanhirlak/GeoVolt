import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BookmarkPlus,
  MapPin,
  Navigation,
  X,
} from "lucide-react";

import "./AlternativeCandidatesModal.css";

const MAX_ALTERNATIVE_COUNT = 6;
const EARTH_RADIUS_KM = 6371;

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(/ı/g, "i");
}

function hasValue(value) {
  return !(
    value === null ||
    value === undefined ||
    value === ""
  );
}

function toFiniteNumber(value) {
  if (!hasValue(value)) {
    return null;
  }

  const numericValue =
    Number(value);

  return Number.isFinite(
    numericValue
  )
    ? numericValue
    : null;
}

function formatMoney(value) {
  const numericValue =
    toFiniteNumber(value);

  if (numericValue === null) {
    return "Veri Eksik";
  }

  return `${numericValue.toLocaleString(
    "tr-TR"
  )} TL`;
}

function showValue(value) {
  return hasValue(value)
    ? value
    : "Veri Eksik";
}

function getCandidateId(candidate) {
  return (
    candidate?.id ??
    candidate?.candidatePointId ??
    null
  );
}

function getRegionName(candidate) {
  return (
    candidate?.region ??
    candidate?.regionName ??
    ""
  );
}

function getNeighborhoodName(
  candidate
) {
  return (
    candidate?.neighborhood ??
    candidate?.neighborhoodName ??
    ""
  );
}

function valuesMatch(
  firstValue,
  secondValue
) {
  const firstNormalized =
    normalizeText(firstValue);

  const secondNormalized =
    normalizeText(secondValue);

  return Boolean(
    firstNormalized &&
      secondNormalized &&
      firstNormalized ===
        secondNormalized
  );
}

function hasSameRegion(
  firstCandidate,
  secondCandidate
) {
  const firstRegionId =
    firstCandidate?.regionId;

  const secondRegionId =
    secondCandidate?.regionId;

  if (
    hasValue(firstRegionId) &&
    hasValue(secondRegionId)
  ) {
    return (
      String(firstRegionId) ===
      String(secondRegionId)
    );
  }

  return valuesMatch(
    getRegionName(firstCandidate),
    getRegionName(secondCandidate)
  );
}

function hasSameNeighborhood(
  firstCandidate,
  secondCandidate
) {
  const firstNeighborhoodId =
    firstCandidate?.neighborhoodId;

  const secondNeighborhoodId =
    secondCandidate?.neighborhoodId;

  if (
    hasValue(firstNeighborhoodId) &&
    hasValue(secondNeighborhoodId)
  ) {
    return (
      String(firstNeighborhoodId) ===
      String(secondNeighborhoodId)
    );
  }

  return valuesMatch(
    getNeighborhoodName(
      firstCandidate
    ),
    getNeighborhoodName(
      secondCandidate
    )
  );
}

function toRadians(value) {
  return (
    value *
    (Math.PI / 180)
  );
}

function calculateDistanceKm(
  firstCandidate,
  secondCandidate
) {
  const firstLatitude =
    toFiniteNumber(
      firstCandidate?.latitude
    );

  const firstLongitude =
    toFiniteNumber(
      firstCandidate?.longitude
    );

  const secondLatitude =
    toFiniteNumber(
      secondCandidate?.latitude
    );

  const secondLongitude =
    toFiniteNumber(
      secondCandidate?.longitude
    );

  if (
    firstLatitude === null ||
    firstLongitude === null ||
    secondLatitude === null ||
    secondLongitude === null
  ) {
    return null;
  }

  const latitudeDifference =
    toRadians(
      secondLatitude -
        firstLatitude
    );

  const longitudeDifference =
    toRadians(
      secondLongitude -
        firstLongitude
    );

  const firstLatitudeRadians =
    toRadians(firstLatitude);

  const secondLatitudeRadians =
    toRadians(secondLatitude);

  const haversineValue =
    Math.sin(
      latitudeDifference / 2
    ) ** 2 +
    Math.cos(
      firstLatitudeRadians
    ) *
      Math.cos(
        secondLatitudeRadians
      ) *
      Math.sin(
        longitudeDifference / 2
      ) ** 2;

  const centralAngle =
    2 *
    Math.atan2(
      Math.sqrt(haversineValue),
      Math.sqrt(
        1 - haversineValue
      )
    );

  return (
    EARTH_RADIUS_KM *
    centralAngle
  );
}

function formatDistance(
  distanceKm
) {
  if (distanceKm === null) {
    return "Mesafe hesaplanamadı";
  }

  if (distanceKm < 1) {
    return `${Math.round(
      distanceKm * 1000
    )} m uzakta`;
  }

  return `${distanceKm.toLocaleString(
    "tr-TR",
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }
  )} km uzakta`;
}

function getRelationshipPriority(
  candidate,
  selectedCandidate
) {
  if (
    hasSameNeighborhood(
      candidate,
      selectedCandidate
    )
  ) {
    return 0;
  }

  if (
    hasSameRegion(
      candidate,
      selectedCandidate
    )
  ) {
    return 1;
  }

  return 2;
}

function getRelationshipLabel(
  candidate,
  selectedCandidate
) {
  if (
    hasSameNeighborhood(
      candidate,
      selectedCandidate
    )
  ) {
    return "Aynı mahalle";
  }

  if (
    hasSameRegion(
      candidate,
      selectedCandidate
    )
  ) {
    return "Aynı bölge";
  }

  return "Yakın alternatif";
}

function createCandidateKey(
  candidate,
  index
) {
  const candidateId =
    getCandidateId(candidate);

  if (hasValue(candidateId)) {
    return `id-${candidateId}`;
  }

  return [
    "coordinate",
    candidate?.latitude ?? "unknown",
    candidate?.longitude ?? "unknown",
    index,
  ].join("-");
}

function createTestIdPart(value) {
  return String(
    value ?? "unknown"
  )
    .trim()
    .replace(
      /[^a-zA-Z0-9_-]/g,
      "-"
    );
}

function buildAlternatives(
  selectedCandidate,
  candidates
) {
  if (
    !selectedCandidate ||
    !Array.isArray(candidates)
  ) {
    return [];
  }

  const selectedId =
    getCandidateId(
      selectedCandidate
    );

  const uniqueCandidates =
    new Map();

  candidates.forEach(
    (candidate, index) => {
      if (!candidate) {
        return;
      }

      const candidateId =
        getCandidateId(candidate);

      if (
        hasValue(selectedId) &&
        hasValue(candidateId) &&
        String(selectedId) ===
          String(candidateId)
      ) {
        return;
      }

      const key =
        createCandidateKey(
          candidate,
          index
        );

      if (
        !uniqueCandidates.has(key)
      ) {
        uniqueCandidates.set(
          key,
          candidate
        );
      }
    }
  );

  return Array.from(
    uniqueCandidates.entries()
  )
    .map(
      ([
        candidateKey,
        candidate,
      ]) => ({
        candidateKey,
        candidate,

        relationshipPriority:
          getRelationshipPriority(
            candidate,
            selectedCandidate
          ),

        relationshipLabel:
          getRelationshipLabel(
            candidate,
            selectedCandidate
          ),

        distanceKm:
          calculateDistanceKm(
            selectedCandidate,
            candidate
          ),

        generalScore:
          toFiniteNumber(
            candidate.generalScore
          ),
      })
    )
    .sort(
      (first, second) => {
        if (
          first.relationshipPriority !==
          second.relationshipPriority
        ) {
          return (
            first.relationshipPriority -
            second.relationshipPriority
          );
        }

        const firstScore =
          first.generalScore ?? -1;

        const secondScore =
          second.generalScore ?? -1;

        if (
          firstScore !==
          secondScore
        ) {
          return (
            secondScore -
            firstScore
          );
        }

        const firstDistance =
          first.distanceKm ??
          Number.POSITIVE_INFINITY;

        const secondDistance =
          second.distanceKm ??
          Number.POSITIVE_INFINITY;

        return (
          firstDistance -
          secondDistance
        );
      }
    )
    .slice(
      0,
      MAX_ALTERNATIVE_COUNT
    );
}

export default function AlternativeCandidatesModal({
  isOpen,
  selectedCandidate,
  candidates = [],
  onClose,
  onCandidateSelect,
  onSaveCandidate,
}) {
  const [
    savingCandidateId,
    setSavingCandidateId,
  ] = useState(null);

  const alternatives =
    useMemo(
      () =>
        buildAlternatives(
          selectedCandidate,
          candidates
        ),
      [
        selectedCandidate,
        candidates,
      ]
    );

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setSavingCandidateId(
        null
      );
    }
  }, [isOpen]);

  if (
    !isOpen ||
    !selectedCandidate
  ) {
    return null;
  }

  async function handleSave(
    event,
    candidate
  ) {
    event.stopPropagation();

    const candidateId =
      getCandidateId(candidate);

    setSavingCandidateId(
      candidateId
    );

    try {
      await onSaveCandidate?.(
        candidate
      );
    } finally {
      setSavingCandidateId(
        null
      );
    }
  }

  return (
    <div
      className="alternative-modal-backdrop"
      data-testid="alternative-candidates-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose?.();
        }
      }}
    >
      <section
        className="alternative-modal"
        data-testid="alternative-candidates-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alternative-modal-title"
      >
        <header className="alternative-modal-header">
          <div>
            <span className="alternative-modal-eyebrow">
              Seçili aday
            </span>

            <h2 id="alternative-modal-title">
              Alternatif Aday Noktalar
            </h2>

            <p>
              <strong>
                {selectedCandidate.name ||
                  "Aday Nokta"}
              </strong>

              {
                " için aynı mahalle, aynı bölge, genel skor ve mesafeye göre sıralandı."
              }
            </p>
          </div>

          <button
            type="button"
            className="alternative-modal-close"
            aria-label="Alternatif adaylar penceresini kapat"
            title="Kapat"
            data-testid="alternative-modal-close-button"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </header>

        <div className="alternative-selected-summary">
          <div>
            <span>Genel Skor</span>

            <strong>
              {showValue(
                selectedCandidate.generalScore
              )}
            </strong>
          </div>

          <div>
            <span>Mahalle</span>

            <strong>
              {showValue(
                getNeighborhoodName(
                  selectedCandidate
                )
              )}
            </strong>
          </div>

          <div>
            <span>
              Tahmini Maliyet
            </span>

            <strong>
              {formatMoney(
                selectedCandidate.estimatedCost
              )}
            </strong>
          </div>
        </div>

        <div className="alternative-modal-content">
          {alternatives.length === 0 ? (
            <div
              className="alternative-modal-empty"
              data-testid="alternative-candidates-empty"
            >
              <MapPin size={34} />

              <h3>
                Alternatif aday bulunamadı
              </h3>

              <p>
                Gerçek aday verileri
                geldiğinde aynı mahalle ve
                bölgedeki uygun adaylar
                burada listelenecek.
              </p>
            </div>
          ) : (
            <div
              className="alternative-candidate-list"
              data-testid="alternative-candidates-list"
            >
              {alternatives.map(
                ({
                  candidateKey,
                  candidate,
                  relationshipLabel,
                  distanceKm,
                }) => {
                  const candidateId =
                    getCandidateId(
                      candidate
                    );

                  const testIdPart =
                    createTestIdPart(
                      candidateId
                    );

                  const isSaving =
                    String(
                      savingCandidateId
                    ) ===
                    String(candidateId);

                  return (
                    <article
                      key={candidateKey}
                      className="alternative-candidate-card"
                      data-testid={`alternative-candidate-card-${testIdPart}`}
                    >
                      <div className="alternative-candidate-card-header">
                        <div>
                          <span className="alternative-relation-badge">
                            {
                              relationshipLabel
                            }
                          </span>

                          <h3>
                            {candidate.name ||
                              "Aday Nokta"}
                          </h3>
                        </div>

                        <div className="alternative-score-badge">
                          <small>
                            Genel Skor
                          </small>

                          <strong>
                            {showValue(
                              candidate.generalScore
                            )}
                          </strong>
                        </div>
                      </div>

                      <p className="alternative-address">
                        <MapPin size={16} />

                        <span>
                          {candidate.estimatedAddress ||
                            getNeighborhoodName(
                              candidate
                            ) ||
                            getRegionName(
                              candidate
                            ) ||
                            "Adres bilgisi yok"}
                        </span>
                      </p>

                      <p className="alternative-distance">
                        <Navigation
                          size={15}
                        />

                        <span>
                          {formatDistance(
                            distanceKm
                          )}
                        </span>
                      </p>

                      <div className="alternative-candidate-stats">
                        <div>
                          <span>
                            Maliyet
                          </span>

                          <strong>
                            {formatMoney(
                              candidate.estimatedCost
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Maliyet Skoru
                          </span>

                          <strong>
                            {showValue(
                              candidate.costScore
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Talep Skoru
                          </span>

                          <strong>
                            {showValue(
                              candidate.demandScore
                            )}
                          </strong>
                        </div>
                      </div>

                      <div className="alternative-candidate-actions">
                        <button
                          type="button"
                          className="alternative-map-button"
                          data-testid={`alternative-show-on-map-button-${testIdPart}`}
                          onClick={() =>
                            onCandidateSelect?.(
                              candidate
                            )
                          }
                        >
                          <MapPin size={17} />

                          Haritada Göster
                        </button>

                        <button
                          type="button"
                          className="alternative-save-button"
                          disabled={
                            isSaving
                          }
                          data-testid={`alternative-save-button-${testIdPart}`}
                          onClick={(
                            event
                          ) =>
                            handleSave(
                              event,
                              candidate
                            )
                          }
                        >
                          <BookmarkPlus
                            size={17}
                          />

                          {isSaving
                            ? "Kaydediliyor..."
                            : "Kaydet"}
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}