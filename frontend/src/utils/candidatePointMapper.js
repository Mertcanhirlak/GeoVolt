const CANKAYA_BOUNDS = {
  minLatitude: 39.7,
  maxLatitude: 40.1,
  minLongitude: 32.5,
  maxLongitude: 33.2,
};

function getFirstValue(source, keys) {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  for (const key of keys) {
    if (
      Object.prototype.hasOwnProperty.call(source, key) &&
      source[key] !== null &&
      source[key] !== undefined &&
      source[key] !== ""
    ) {
      return source[key];
    }
  }

  return undefined;
}

function toText(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();

  return text || fallback;
}

function toNullableNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null;
  }

  let normalizedValue = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(/[₺TLtl]/g, "");

  /*
   * 450.000 gibi Türkçe binlik ayıracı bulunan
   * değerleri düzeltir.
   *
   * 39.9208 gibi koordinatlara dokunmaz.
   */
  if (
    /^-?\d{1,3}(\.\d{3})+$/.test(
      normalizedValue
    )
  ) {
    normalizedValue =
      normalizedValue.replace(/\./g, "");
  }

  /*
   * 450.000,50 veya 82,5 gibi Türkçe sayı
   * biçimlerini destekler.
   */
  if (normalizedValue.includes(",")) {
    normalizedValue = normalizedValue
      .replace(/\./g, "")
      .replace(",", ".");
  }

  const numberValue =
    Number(normalizedValue);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}

function toScore(value) {
  const score = toNullableNumber(value);

  if (score === null) {
    return null;
  }

  return Math.min(
    100,
    Math.max(0, Math.round(score))
  );
}

function toBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  const normalizedValue = String(
    value ?? ""
  )
    .trim()
    .toLocaleLowerCase("tr-TR");

  return [
    "true",
    "1",
    "yes",
    "evet",
  ].includes(normalizedValue);
}

function isValidLatitude(value) {
  return (
    Number.isFinite(value) &&
    value >= -90 &&
    value <= 90
  );
}

function isValidLongitude(value) {
  return (
    Number.isFinite(value) &&
    value >= -180 &&
    value <= 180
  );
}

function isInsideCankaya(
  latitude,
  longitude
) {
  return (
    latitude >=
      CANKAYA_BOUNDS.minLatitude &&
    latitude <=
      CANKAYA_BOUNDS.maxLatitude &&
    longitude >=
      CANKAYA_BOUNDS.minLongitude &&
    longitude <=
      CANKAYA_BOUNDS.maxLongitude
  );
}

/**
 * Backend veya mock veri enlem-boylam alanlarını
 * ters göndermişse Çankaya sınırlarına göre otomatik
 * olarak doğru sıraya çevirir.
 */
function normalizeCoordinates(
  rawLatitude,
  rawLongitude
) {
  const latitude =
    toNullableNumber(rawLatitude);

  const longitude =
    toNullableNumber(rawLongitude);

  if (
    latitude === null ||
    longitude === null
  ) {
    return {
      latitude,
      longitude,
    };
  }

  const directCoordinatesValid =
    isValidLatitude(latitude) &&
    isValidLongitude(longitude);

  const swappedCoordinatesValid =
    isValidLatitude(longitude) &&
    isValidLongitude(latitude);

  const directInsideCankaya =
    directCoordinatesValid &&
    isInsideCankaya(
      latitude,
      longitude
    );

  const swappedInsideCankaya =
    swappedCoordinatesValid &&
    isInsideCankaya(
      longitude,
      latitude
    );

  /*
   * Doğrudan değer Çankaya dışında,
   * ters çevrilmiş değer Çankaya içindeyse
   * enlem-boylam ters gelmiştir.
   */
  if (
    !directInsideCankaya &&
    swappedInsideCankaya
  ) {
    return {
      latitude: longitude,
      longitude: latitude,
    };
  }

  /*
   * Doğrudan koordinat teknik olarak geçersiz,
   * ters çevrilmiş biçimi geçerliyse yine düzeltir.
   */
  if (
    !directCoordinatesValid &&
    swappedCoordinatesValid
  ) {
    return {
      latitude: longitude,
      longitude: latitude,
    };
  }

  return {
    latitude,
    longitude,
  };
}

function createEstimatedAddress({
  estimatedAddress,
  city,
  district,
  region,
  neighborhood,
}) {
  if (estimatedAddress) {
    return estimatedAddress;
  }

  const addressParts = [
    city,
    district,
    region,
    neighborhood,
  ].filter(Boolean);

  if (addressParts.length === 0) {
    return "Adres bilgisi yok";
  }

  return addressParts.join(" / ");
}

function normalizeStatus(
  rawStatus,
  candidate
) {
  const normalizedStatus = String(
    rawStatus ?? ""
  )
    .trim()
    .toLocaleLowerCase("tr-TR");

  if (
    normalizedStatus.includes("hesap") ||
    normalizedStatus.includes(
      "calculat"
    ) ||
    normalizedStatus.includes(
      "pending"
    ) ||
    normalizedStatus.includes(
      "processing"
    )
  ) {
    return "calculating";
  }

  if (
    normalizedStatus.includes("eksik") ||
    normalizedStatus.includes(
      "missing"
    ) ||
    normalizedStatus.includes(
      "invalid"
    ) ||
    normalizedStatus.includes("error")
  ) {
    return "missing";
  }

  const hasCoordinates =
    candidate.latitude !== null &&
    candidate.longitude !== null;

  const hasScores =
    candidate.costScore !== null &&
    candidate.demandScore !== null &&
    candidate.generalScore !== null;

  if (!hasCoordinates || !hasScores) {
    return "missing";
  }

  return "ready";
}

/**
 * Backend, GeoJSON, mock, PascalCase veya snake_case
 * veriyi frontend'in kullandığı ortak aday nokta
 * modeline dönüştürür.
 */
export function mapCandidatePoint(
  rawCandidate,
  index = 0
) {
  if (
    !rawCandidate ||
    typeof rawCandidate !== "object"
  ) {
    return null;
  }

  const id =
    getFirstValue(rawCandidate, [
      "id",
      "Id",
      "ID",
      "candidatePointId",
      "candidate_point_id",
      "pointId",
      "point_id",
    ]) ?? `candidate-${index + 1}`;

  const city = toText(
    getFirstValue(rawCandidate, [
      "city",
      "City",
      "province",
      "Province",
      "il",
      "IL",
    ])
  );

  const district = toText(
    getFirstValue(rawCandidate, [
      "district",
      "District",
      "county",
      "County",
      "ilce",
      "ilçe",
      "ILCE",
    ]),
    "Çankaya"
  );

  const region = toText(
    getFirstValue(rawCandidate, [
      "region",
      "Region",
      "regionName",
      "RegionName",
      "region_name",
      "semt",
      "SEMT",
    ])
  );

  const neighborhood = toText(
    getFirstValue(rawCandidate, [
      "neighborhood",
      "Neighborhood",
      "neighborhoodName",
      "NeighborhoodName",
      "neighborhood_name",
      "mahalle",
      "MAHALLE",
    ])
  );

  const estimatedAddressValue = toText(
    getFirstValue(rawCandidate, [
      "estimatedAddress",
      "EstimatedAddress",
      "estimated_address",
      "address",
      "Address",
      "fullAddress",
      "full_address",
      "adres",
      "ADRES",
    ])
  );

  const costScore = toScore(
    getFirstValue(rawCandidate, [
      "costScore",
      "CostScore",
      "cost_score",
      "maliyetSkoru",
      "maliyet_skoru",
      "MALIYET_SKORU",
    ])
  );

  const demandScore = toScore(
    getFirstValue(rawCandidate, [
      "demandScore",
      "DemandScore",
      "demand_score",
      "talepSkoru",
      "talep_skoru",
      "TALEP_SKORU",
    ])
  );

  /*
   * Backend generalScore göndermediğinde frontend
   * kendi kendine skor üretmez.
   *
   * Gerçek skor yoksa null kalır ve ekranda
   * "Veri Eksik" olarak gösterilir.
   */
  const generalScore = toScore(
    getFirstValue(rawCandidate, [
      "generalScore",
      "GeneralScore",
      "general_score",
      "overallScore",
      "overall_score",
      "genelSkor",
      "genel_skor",
      "GENEL_SKOR",
    ])
  );

  const rawLatitude = getFirstValue(
    rawCandidate,
    [
      "latitude",
      "Latitude",
      "LATITUDE",
      "lat",
      "Lat",
      "enlem",
      "ENLEM",
      "y",
      "Y",
    ]
  );

  const rawLongitude = getFirstValue(
    rawCandidate,
    [
      "longitude",
      "Longitude",
      "LONGITUDE",
      "lng",
      "Lng",
      "lon",
      "Lon",
      "boylam",
      "BOYLAM",
      "x",
      "X",
    ]
  );

  const {
    latitude,
    longitude,
  } = normalizeCoordinates(
    rawLatitude,
    rawLongitude
  );

  const candidate = {
    id,

    name: toText(
      getFirstValue(rawCandidate, [
        "name",
        "Name",
        "NAME",
        "title",
        "Title",
        "candidateName",
        "candidate_name",
      ]),
      `Aday Nokta ${index + 1}`
    ),

    estimatedAddress:
      createEstimatedAddress({
        estimatedAddress:
          estimatedAddressValue,
        city,
        district,
        region,
        neighborhood,
      }),

    city,
    district,
    region,
    neighborhood,

    regionId:
      getFirstValue(rawCandidate, [
        "regionId",
        "RegionId",
        "region_id",
      ]) ?? null,

    neighborhoodId:
      getFirstValue(rawCandidate, [
        "neighborhoodId",
        "NeighborhoodId",
        "neighborhood_id",
      ]) ?? null,

    estimatedCost: toNullableNumber(
      getFirstValue(rawCandidate, [
        "estimatedCost",
        "EstimatedCost",
        "estimated_cost",
        "installationCost",
        "installation_cost",
        "tahminiMaliyet",
        "tahmini_maliyet",
        "TAHMINI_MALIYET",
      ])
    ),

    costScore,
    demandScore,
    generalScore,

    latitude,
    longitude,

    systemType: toText(
      getFirstValue(rawCandidate, [
        "systemType",
        "SystemType",
        "system_type",
        "chargingType",
        "charging_type",
        "sistemTipi",
        "sistem_tipi",
      ]),
      "Belirtilmedi"
    ),

    placeType: toText(
      getFirstValue(rawCandidate, [
        "placeType",
        "PlaceType",
        "place_type",
        "locationType",
        "location_type",
        "mekanTuru",
        "mekan_turu",
      ]),
      "Belirtilmedi"
    ),

    isManual: toBoolean(
      getFirstValue(rawCandidate, [
        "isManual",
        "IsManual",
        "is_manual",
        "manual",
      ])
    ),

    calculationVersion: toText(
      getFirstValue(rawCandidate, [
        "calculationVersion",
        "CalculationVersion",
        "calculation_version",
        "scoreVersion",
        "score_version",
      ])
    ),

    status: "ready",
  };

  candidate.status = normalizeStatus(
    getFirstValue(rawCandidate, [
      "status",
      "Status",
      "STATUS",
      "calculationStatus",
      "calculation_status",
    ]),
    candidate
  );

  return candidate;
}

export function mapCandidatePoints(
  rawCandidates
) {
  if (!Array.isArray(rawCandidates)) {
    return [];
  }

  return rawCandidates
    .map((candidate, index) =>
      mapCandidatePoint(
        candidate,
        index
      )
    )
    .filter(Boolean);
}