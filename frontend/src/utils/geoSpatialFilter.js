function toFiniteNumber(value) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : null;
}

function normalizePosition(position) {
  if (!Array.isArray(position) || position.length < 2) {
    return null;
  }

  const longitude = toFiniteNumber(position[0]);
  const latitude = toFiniteNumber(position[1]);

  if (longitude === null || latitude === null) {
    return null;
  }

  return [longitude, latitude];
}

function calculateCoordinatesBounds(coordinates) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  function visit(value) {
    if (!Array.isArray(value)) {
      return;
    }

    const position = normalizePosition(value);

    if (position) {
      minX = Math.min(minX, position[0]);
      minY = Math.min(minY, position[1]);
      maxX = Math.max(maxX, position[0]);
      maxY = Math.max(maxY, position[1]);
      return;
    }

    value.forEach(visit);
  }

  visit(coordinates);

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return null;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
  };
}

function boundsOverlap(firstBounds, secondBounds) {
  if (!firstBounds || !secondBounds) {
    return false;
  }

  return !(
    firstBounds.maxX < secondBounds.minX ||
    firstBounds.minX > secondBounds.maxX ||
    firstBounds.maxY < secondBounds.minY ||
    firstBounds.minY > secondBounds.maxY
  );
}

function pointWithinBounds(point, bounds) {
  if (!point || !bounds) {
    return false;
  }

  return (
    point[0] >= bounds.minX &&
    point[0] <= bounds.maxX &&
    point[1] >= bounds.minY &&
    point[1] <= bounds.maxY
  );
}

function pointOnSegment(point, start, end) {
  const epsilon = 1e-10;
  const crossProduct =
    (point[1] - start[1]) * (end[0] - start[0]) -
    (point[0] - start[0]) * (end[1] - start[1]);

  if (Math.abs(crossProduct) > epsilon) {
    return false;
  }

  const dotProduct =
    (point[0] - start[0]) * (end[0] - start[0]) +
    (point[1] - start[1]) * (end[1] - start[1]);

  if (dotProduct < -epsilon) {
    return false;
  }

  const segmentLengthSquared =
    (end[0] - start[0]) ** 2 +
    (end[1] - start[1]) ** 2;

  return dotProduct <= segmentLengthSquared + epsilon;
}

function pointInRing(point, ring) {
  if (!Array.isArray(ring) || ring.length < 3) {
    return false;
  }

  let isInside = false;

  for (
    let currentIndex = 0, previousIndex = ring.length - 1;
    currentIndex < ring.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const currentPoint = normalizePosition(ring[currentIndex]);
    const previousPoint = normalizePosition(ring[previousIndex]);

    if (!currentPoint || !previousPoint) {
      continue;
    }

    if (pointOnSegment(point, previousPoint, currentPoint)) {
      return true;
    }

    const crossesHorizontalRay =
      currentPoint[1] > point[1] !== previousPoint[1] > point[1];

    if (!crossesHorizontalRay) {
      continue;
    }

    const intersectionLongitude =
      ((previousPoint[0] - currentPoint[0]) *
        (point[1] - currentPoint[1])) /
        (previousPoint[1] - currentPoint[1]) +
      currentPoint[0];

    if (point[0] < intersectionLongitude) {
      isInside = !isInside;
    }
  }

  return isInside;
}

function pointInPolygon(point, polygon) {
  if (!polygon || !Array.isArray(polygon.rings) || polygon.rings.length === 0) {
    return false;
  }

  if (!pointWithinBounds(point, polygon.bounds)) {
    return false;
  }

  if (!pointInRing(point, polygon.rings[0])) {
    return false;
  }

  for (let ringIndex = 1; ringIndex < polygon.rings.length; ringIndex += 1) {
    if (pointInRing(point, polygon.rings[ringIndex])) {
      return false;
    }
  }

  return true;
}

function orientation(firstPoint, secondPoint, thirdPoint) {
  const value =
    (secondPoint[1] - firstPoint[1]) *
      (thirdPoint[0] - secondPoint[0]) -
    (secondPoint[0] - firstPoint[0]) *
      (thirdPoint[1] - secondPoint[1]);

  const epsilon = 1e-10;

  if (Math.abs(value) <= epsilon) {
    return 0;
  }

  return value > 0 ? 1 : 2;
}

function segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd) {
  const firstOrientation = orientation(firstStart, firstEnd, secondStart);
  const secondOrientation = orientation(firstStart, firstEnd, secondEnd);
  const thirdOrientation = orientation(secondStart, secondEnd, firstStart);
  const fourthOrientation = orientation(secondStart, secondEnd, firstEnd);

  if (
    firstOrientation !== secondOrientation &&
    thirdOrientation !== fourthOrientation
  ) {
    return true;
  }

  return (
    (firstOrientation === 0 &&
      pointOnSegment(secondStart, firstStart, firstEnd)) ||
    (secondOrientation === 0 &&
      pointOnSegment(secondEnd, firstStart, firstEnd)) ||
    (thirdOrientation === 0 &&
      pointOnSegment(firstStart, secondStart, secondEnd)) ||
    (fourthOrientation === 0 &&
      pointOnSegment(firstEnd, secondStart, secondEnd))
  );
}

function createRingEdges(ring) {
  if (!Array.isArray(ring) || ring.length < 2) {
    return [];
  }

  const edges = [];

  for (let index = 1; index < ring.length; index += 1) {
    const start = normalizePosition(ring[index - 1]);
    const end = normalizePosition(ring[index]);

    if (!start || !end) {
      continue;
    }

    edges.push({
      start,
      end,
      bounds: calculateCoordinatesBounds([start, end]),
    });
  }

  const first = normalizePosition(ring[0]);
  const last = normalizePosition(ring[ring.length - 1]);

  if (
    first &&
    last &&
    (first[0] !== last[0] || first[1] !== last[1])
  ) {
    edges.push({
      start: last,
      end: first,
      bounds: calculateCoordinatesBounds([last, first]),
    });
  }

  return edges;
}

function normalizePolygonCoordinates(polygonCoordinates) {
  if (!Array.isArray(polygonCoordinates) || polygonCoordinates.length === 0) {
    return null;
  }

  const rings = polygonCoordinates
    .map((ring) =>
      Array.isArray(ring)
        ? ring.map(normalizePosition).filter(Boolean)
        : [],
    )
    .filter((ring) => ring.length >= 3);

  if (rings.length === 0) {
    return null;
  }

  const bounds = calculateCoordinatesBounds(rings);

  if (!bounds) {
    return null;
  }

  return {
    rings,
    bounds,
    edges: rings.flatMap(createRingEdges),
  };
}

function collectPolygons(value, target) {
  if (!value || typeof value !== "object") {
    return;
  }

  if (value.type === "FeatureCollection" && Array.isArray(value.features)) {
    value.features.forEach((feature) => collectPolygons(feature, target));
    return;
  }

  if (value.type === "Feature") {
    collectPolygons(value.geometry, target);
    return;
  }

  if (value.type === "GeometryCollection" && Array.isArray(value.geometries)) {
    value.geometries.forEach((geometry) => collectPolygons(geometry, target));
    return;
  }

  if (value.type === "Polygon") {
    const polygon = normalizePolygonCoordinates(value.coordinates);

    if (polygon) {
      target.push(polygon);
    }

    return;
  }

  if (value.type === "MultiPolygon" && Array.isArray(value.coordinates)) {
    value.coordinates.forEach((polygonCoordinates) => {
      const polygon = normalizePolygonCoordinates(polygonCoordinates);

      if (polygon) {
        target.push(polygon);
      }
    });
  }
}

function parseBoundaryValue(boundaryGeoJson) {
  if (!boundaryGeoJson) {
    return null;
  }

  if (typeof boundaryGeoJson === "string") {
    const trimmedValue = boundaryGeoJson.trim();

    if (!trimmedValue) {
      return null;
    }

    try {
      return JSON.parse(trimmedValue);
    } catch {
      return null;
    }
  }

  if (typeof boundaryGeoJson === "object") {
    return boundaryGeoJson;
  }

  return null;
}

export function createSpatialBoundary(boundaryGeoJson) {
  const parsedBoundary = parseBoundaryValue(boundaryGeoJson);

  if (!parsedBoundary) {
    return null;
  }

  const polygons = [];
  collectPolygons(parsedBoundary, polygons);

  if (polygons.length === 0) {
    return null;
  }

  const bounds = calculateCoordinatesBounds(
    polygons.flatMap((polygon) => polygon.rings),
  );

  if (!bounds) {
    return null;
  }

  return {
    polygons,
    bounds,
  };
}

export function isPointInsideBoundary(longitude, latitude, boundary) {
  const point = [
    toFiniteNumber(longitude),
    toFiniteNumber(latitude),
  ];

  if (
    !boundary ||
    point[0] === null ||
    point[1] === null ||
    !pointWithinBounds(point, boundary.bounds)
  ) {
    return false;
  }

  return boundary.polygons.some((polygon) => pointInPolygon(point, polygon));
}

function normalizeLineCoordinates(coordinates) {
  if (!Array.isArray(coordinates)) {
    return [];
  }

  return coordinates.map(normalizePosition).filter(Boolean);
}

function collectLineStrings(geometry, target) {
  if (!geometry || typeof geometry !== "object") {
    return;
  }

  if (geometry.type === "Feature") {
    collectLineStrings(geometry.geometry, target);
    return;
  }

  if (geometry.type === "FeatureCollection" && Array.isArray(geometry.features)) {
    geometry.features.forEach((feature) => collectLineStrings(feature, target));
    return;
  }

  if (geometry.type === "GeometryCollection" && Array.isArray(geometry.geometries)) {
    geometry.geometries.forEach((item) => collectLineStrings(item, target));
    return;
  }

  if (geometry.type === "LineString") {
    const line = normalizeLineCoordinates(geometry.coordinates);

    if (line.length >= 2) {
      target.push(line);
    }

    return;
  }

  if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
    geometry.coordinates.forEach((coordinates) => {
      const line = normalizeLineCoordinates(coordinates);

      if (line.length >= 2) {
        target.push(line);
      }
    });
  }
}

function lineIntersectsPolygon(line, polygon) {
  const lineBounds = calculateCoordinatesBounds(line);

  if (!boundsOverlap(lineBounds, polygon.bounds)) {
    return false;
  }

  if (line.some((point) => pointInPolygon(point, polygon))) {
    return true;
  }

  for (let lineIndex = 1; lineIndex < line.length; lineIndex += 1) {
    const lineStart = line[lineIndex - 1];
    const lineEnd = line[lineIndex];
    const lineSegmentBounds = calculateCoordinatesBounds([lineStart, lineEnd]);

    for (const edge of polygon.edges) {
      if (!boundsOverlap(lineSegmentBounds, edge.bounds)) {
        continue;
      }

      if (segmentsIntersect(lineStart, lineEnd, edge.start, edge.end)) {
        return true;
      }
    }
  }

  return false;
}

export function doesGeometryIntersectBoundary(geometry, boundary) {
  if (!geometry || !boundary) {
    return false;
  }

  const lineStrings = [];
  collectLineStrings(geometry, lineStrings);

  if (lineStrings.length === 0) {
    return false;
  }

  return lineStrings.some((line) => {
    const lineBounds = calculateCoordinatesBounds(line);

    if (!boundsOverlap(lineBounds, boundary.bounds)) {
      return false;
    }

    return boundary.polygons.some((polygon) =>
      lineIntersectsPolygon(line, polygon),
    );
  });
}
