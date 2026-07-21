import React, {
  useEffect,
  useState,
} from "react";

import {
  deleteSavedCandidatePoint,
  getSavedCandidatePoints,
  MAX_SAVED_CANDIDATES,
} from "../services/savedCandidatePointsApi";

function formatMoney(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Veri Eksik";
  }

  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue
    )
  ) {
    return "Veri Eksik";
  }

  return `${numericValue.toLocaleString(
    "tr-TR"
  )} TL`;
}

function showValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Veri Eksik";
  }

  return value;
}

function showCoordinate(
  latitude,
  longitude
) {
  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined
  ) {
    return "Veri Eksik";
  }

  const numericLatitude =
    Number(latitude);

  const numericLongitude =
    Number(longitude);

  if (
    !Number.isFinite(
      numericLatitude
    ) ||
    !Number.isFinite(
      numericLongitude
    )
  ) {
    return "Veri Eksik";
  }

  return `${numericLatitude.toFixed(
    6
  )}, ${numericLongitude.toFixed(6)}`;
}

function getStatusText(candidate) {
  if (candidate.isManual) {
    return "Manuel Pin";
  }

  if (
    candidate.status ===
    "calculating"
  ) {
    return "Hesaplanıyor";
  }

  if (
    candidate.status ===
    "missing"
  ) {
    return "Veri Eksik";
  }

  if (
    candidate.status ===
    "ready" ||
    candidate.status ===
    "complete"
  ) {
    return "Hazır";
  }

  return showValue(
    candidate.status
  );
}

export default function SavedCandidates({
  refreshKey,
}) {
  const [
    savedCandidates,
    setSavedCandidates,
  ] = useState([]);

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [
    deletingCandidateId,
    setDeletingCandidateId,
  ] = useState(null);

  useEffect(() => {
    loadSavedCandidates();
  }, [refreshKey]);

  async function loadSavedCandidates() {
    setLoading(true);

    try {
      const result =
        await getSavedCandidatePoints();

      setSavedCandidates(
        Array.isArray(result.data)
          ? result.data
          : []
      );

      if (
        result.source ===
        "api-and-local-storage"
      ) {
        setMessage(
          "API kayıtları ve manuel/lokal kayıtlar birlikte gösteriliyor."
        );

        return;
      }

      if (result.source === "api") {
        setMessage(
          "Kaydedilen adaylar API üzerinden gösteriliyor."
        );

        return;
      }

      if (
        result.source ===
        "local-storage"
      ) {
        setMessage(
          "Manuel veya lokal kayıtlar bu tarayıcıdan gösteriliyor."
        );

        return;
      }

      setMessage("");
    } catch (error) {
      console.error(
        "Kaydedilen adaylar yüklenemedi:",
        error
      );

      setSavedCandidates([]);

      setMessage(
        "Kaydedilen adaylar yüklenemedi."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(
    candidate
  ) {
    setDeletingCandidateId(
      candidate.id
    );

    try {
      const result =
        await deleteSavedCandidatePoint(
          candidate
        );

      if (!result.success) {
        setMessage(
          "Kayıt silinemedi."
        );

        return;
      }

      setSavedCandidates(
        (currentCandidates) =>
          currentCandidates.filter(
            (currentCandidate) =>
              String(
                currentCandidate.id
              ) !==
                String(candidate.id) &&
              !(
                Number(
                  currentCandidate.latitude
                ).toFixed(6) ===
                  Number(
                    candidate.latitude
                  ).toFixed(6) &&
                Number(
                  currentCandidate.longitude
                ).toFixed(6) ===
                  Number(
                    candidate.longitude
                  ).toFixed(6)
              )
          )
      );

      if (
        result.source ===
        "api-and-local-storage"
      ) {
        setMessage(
          "Kayıt API ve lokal veriden silindi."
        );

        return;
      }

      setMessage(
        candidate.isManual
          ? "Manuel aday kaydı silindi."
          : "Lokal aday kaydı silindi."
      );
    } catch (error) {
      console.error(
        "Kayıt silinemedi:",
        error
      );

      setMessage(
        "Kayıt silinirken bir hata oluştu."
      );
    } finally {
      setDeletingCandidateId(
        null
      );
    }
  }

  return (
    <div
      className="saved-panel"
      data-testid="saved-candidates-panel"
    >
      <div className="saved-panel-title-row">
        <div>
          <h2>
            Kaydedilen Aday Noktalar
          </h2>

          <p>
            En fazla{" "}
            {MAX_SAVED_CANDIDATES} aday
            nokta kaydedilebilir.
          </p>
        </div>

        <div
          className="saved-count-badge"
          data-testid="saved-candidate-count"
        >
          {savedCandidates.length} /{" "}
          {MAX_SAVED_CANDIDATES}
        </div>
      </div>

      {message && (
        <div
          className="info-message"
          data-testid="saved-candidates-message"
        >
          {message}
        </div>
      )}

      {loading ? (
        <p
          className="empty-message"
          data-testid="saved-candidates-loading"
        >
          Kaydedilen adaylar
          yükleniyor...
        </p>
      ) : savedCandidates.length ===
        0 ? (
        <p
          className="empty-message"
          data-testid="saved-candidates-empty-message"
        >
          Henüz kaydedilen aday
          nokta bulunmamaktadır.
        </p>
      ) : (
        <div
          className="saved-list"
          data-testid="saved-candidates-list"
        >
          {savedCandidates.map(
            (candidate) => (
              <div
                key={String(
                  candidate.id
                )}
                className={
                  candidate.isManual
                    ? "saved-card manual-saved-card"
                    : "saved-card"
                }
                data-testid={`saved-candidate-card-${candidate.id}`}
              >
                <div className="saved-card-header">
                  <div>
                    <h3>
                      {showValue(
                        candidate.name
                      )}
                    </h3>

                    <span>
                      {getStatusText(
                        candidate
                      )}
                    </span>
                  </div>

                  {candidate.isManual && (
                    <span
                      className="manual-candidate-badge"
                      data-testid={`manual-candidate-badge-${candidate.id}`}
                    >
                      Manuel
                    </span>
                  )}
                </div>

                <p>
                  <strong>
                    Adres:
                  </strong>{" "}
                  {showValue(
                    candidate.estimatedAddress
                  )}
                </p>

                <p>
                  <strong>
                    Bölge:
                  </strong>{" "}
                  {showValue(
                    candidate.region
                  )}
                </p>

                <p>
                  <strong>
                    Mahalle:
                  </strong>{" "}
                  {showValue(
                    candidate.neighborhood
                  )}
                </p>

                <p>
                  <strong>
                    Tahmini Kurulum
                    Maliyeti:
                  </strong>{" "}
                  {formatMoney(
                    candidate.estimatedCost
                  )}
                </p>

                <p>
                  <strong>
                    Maliyet Skoru:
                  </strong>{" "}
                  {showValue(
                    candidate.costScore
                  )}
                </p>

                <p>
                  <strong>
                    Talep Skoru:
                  </strong>{" "}
                  {showValue(
                    candidate.demandScore
                  )}
                </p>

                <p>
                  <strong>
                    Genel Skor:
                  </strong>{" "}
                  {showValue(
                    candidate.generalScore
                  )}
                </p>

                <p>
                  <strong>
                    Sistem Tipi:
                  </strong>{" "}
                  {showValue(
                    candidate.systemType
                  )}
                </p>

                <p>
                  <strong>
                    Mekân Türü:
                  </strong>{" "}
                  {showValue(
                    candidate.placeType
                  )}
                </p>

                <p>
                  <strong>
                    Koordinat:
                  </strong>{" "}
                  {showCoordinate(
                    candidate.latitude,
                    candidate.longitude
                  )}
                </p>

                {candidate.costSource && (
                  <p>
                    <strong>
                      Maliyet Kaynağı:
                    </strong>{" "}
                    {candidate.costSource}
                  </p>
                )}

                <button
                  type="button"
                  className="delete-button"
                  disabled={
                    String(
                      deletingCandidateId
                    ) ===
                    String(
                      candidate.id
                    )
                  }
                  data-testid={`delete-saved-candidate-button-${candidate.id}`}
                  onClick={() =>
                    handleDelete(
                      candidate
                    )
                  }
                >
                  {String(
                    deletingCandidateId
                  ) ===
                  String(candidate.id)
                    ? "Siliniyor..."
                    : "Kaydı Sil"}
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}