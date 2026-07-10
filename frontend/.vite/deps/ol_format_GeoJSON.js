import {
  Feature_default as Feature_default2,
  LineString_default,
  MultiLineString_default,
  MultiPoint_default,
  MultiPolygon_default
} from "./chunk-GXQ5JSN7.js";
import "./chunk-3TH2XOAI.js";
import {
  Feature_default
} from "./chunk-BW6UQ3IW.js";
import {
  Polygon_default,
  linearRingsAreOriented,
  linearRingssAreOriented,
  orientLinearRings,
  orientLinearRingsArray
} from "./chunk-7BZNLASL.js";
import "./chunk-VUDXURHU.js";
import {
  Geometry_default,
  Point_default,
  deflateCoordinatesArray,
  deflateMultiCoordinatesArray,
  getLayoutForStride
} from "./chunk-GOEGMZQM.js";
import "./chunk-CQGYTO3N.js";
import {
  closestSquaredDistanceXY,
  createOrUpdateEmpty,
  equivalent,
  extend,
  get,
  getCenter,
  getTransform
} from "./chunk-YNSLHB4D.js";
import "./chunk-Z6D76LLD.js";
import {
  EventType_default,
  abstract,
  listen,
  unlistenByKey
} from "./chunk-M2SNNX63.js";
import {
  isEmpty
} from "./chunk-R5DNHDJW.js";
import "./chunk-DC5AMYBS.js";

// node_modules/ol/geom/GeometryCollection.js
var GeometryCollection = class _GeometryCollection extends Geometry_default {
  /**
   * @param {Array<Geometry>} geometries Geometries.
   */
  constructor(geometries) {
    super();
    this.geometries_ = geometries;
    this.changeEventsKeys_ = [];
    this.listenGeometriesChange_();
  }
  /**
   * @private
   */
  unlistenGeometriesChange_() {
    this.changeEventsKeys_.forEach(unlistenByKey);
    this.changeEventsKeys_.length = 0;
  }
  /**
   * @private
   */
  listenGeometriesChange_() {
    const geometries = this.geometries_;
    for (let i = 0, ii = geometries.length; i < ii; ++i) {
      this.changeEventsKeys_.push(
        listen(geometries[i], EventType_default.CHANGE, this.changed, this)
      );
    }
  }
  /**
   * Make a complete copy of the geometry.
   * @return {!GeometryCollection} Clone.
   * @api
   * @override
   */
  clone() {
    const geometryCollection = new _GeometryCollection(
      cloneGeometries(this.geometries_)
    );
    geometryCollection.applyProperties(this);
    return geometryCollection;
  }
  /**
   * @param {number} x X.
   * @param {number} y Y.
   * @param {import("../coordinate.js").Coordinate} closestPoint Closest point.
   * @param {number} minSquaredDistance Minimum squared distance.
   * @return {number} Minimum squared distance.
   * @override
   */
  closestPointXY(x, y, closestPoint, minSquaredDistance) {
    if (minSquaredDistance < closestSquaredDistanceXY(this.getExtent(), x, y)) {
      return minSquaredDistance;
    }
    const geometries = this.geometries_;
    for (let i = 0, ii = geometries.length; i < ii; ++i) {
      minSquaredDistance = geometries[i].closestPointXY(
        x,
        y,
        closestPoint,
        minSquaredDistance
      );
    }
    return minSquaredDistance;
  }
  /**
   * @param {number} x X.
   * @param {number} y Y.
   * @return {boolean} Contains (x, y).
   * @override
   */
  containsXY(x, y) {
    const geometries = this.geometries_;
    for (let i = 0, ii = geometries.length; i < ii; ++i) {
      if (geometries[i].containsXY(x, y)) {
        return true;
      }
    }
    return false;
  }
  /**
   * @param {import("../extent.js").Extent} extent Extent.
   * @protected
   * @return {import("../extent.js").Extent} extent Extent.
   * @override
   */
  computeExtent(extent) {
    createOrUpdateEmpty(extent);
    const geometries = this.geometries_;
    for (let i = 0, ii = geometries.length; i < ii; ++i) {
      extend(extent, geometries[i].getExtent());
    }
    return extent;
  }
  /**
   * Return the geometries that make up this geometry collection.
   * @return {Array<Geometry>} Geometries.
   * @api
   */
  getGeometries() {
    return cloneGeometries(this.geometries_);
  }
  /**
   * @return {Array<Geometry>} Geometries.
   */
  getGeometriesArray() {
    return this.geometries_;
  }
  /**
   * @return {Array<Geometry>} Geometries.
   */
  getGeometriesArrayRecursive() {
    let geometriesArray = [];
    const geometries = this.geometries_;
    for (let i = 0, ii = geometries.length; i < ii; ++i) {
      if (geometries[i].getType() === this.getType()) {
        geometriesArray = geometriesArray.concat(
          /** @type {GeometryCollection} */
          geometries[i].getGeometriesArrayRecursive()
        );
      } else {
        geometriesArray.push(geometries[i]);
      }
    }
    return geometriesArray;
  }
  /**
   * Create a simplified version of this geometry using the Douglas Peucker algorithm.
   * @param {number} squaredTolerance Squared tolerance.
   * @return {GeometryCollection} Simplified GeometryCollection.
   * @override
   */
  getSimplifiedGeometry(squaredTolerance) {
    if (this.simplifiedGeometryRevision !== this.getRevision()) {
      this.simplifiedGeometryMaxMinSquaredTolerance = 0;
      this.simplifiedGeometryRevision = this.getRevision();
    }
    if (squaredTolerance < 0 || this.simplifiedGeometryMaxMinSquaredTolerance !== 0 && squaredTolerance < this.simplifiedGeometryMaxMinSquaredTolerance) {
      return this;
    }
    const simplifiedGeometries = [];
    const geometries = this.geometries_;
    let simplified = false;
    for (let i = 0, ii = geometries.length; i < ii; ++i) {
      const geometry = geometries[i];
      const simplifiedGeometry = geometry.getSimplifiedGeometry(squaredTolerance);
      simplifiedGeometries.push(simplifiedGeometry);
      if (simplifiedGeometry !== geometry) {
        simplified = true;
      }
    }
    if (simplified) {
      const simplifiedGeometryCollection = new _GeometryCollection(
        simplifiedGeometries
      );
      return simplifiedGeometryCollection;
    }
    this.simplifiedGeometryMaxMinSquaredTolerance = squaredTolerance;
    return this;
  }
  /**
   * Get the type of this geometry.
   * @return {import("./Geometry.js").Type} Geometry type.
   * @api
   * @override
   */
  getType() {
    return "GeometryCollection";
  }
  /**
   * Test if the geometry and the passed extent intersect.
   * @param {import("../extent.js").Extent} extent Extent.
   * @return {boolean} `true` if the geometry and the extent intersect.
   * @api
   * @override
   */
  intersectsExtent(extent) {
    const geometries = this.geometries_;
    for (let i = 0, ii = geometries.length; i < ii; ++i) {
      if (geometries[i].intersectsExtent(extent)) {
        return true;
      }
    }
    return false;
  }
  /**
   * @return {boolean} Is empty.
   */
  isEmpty() {
    return this.geometries_.length === 0;
  }
  /**
   * Rotate the geometry around a given coordinate. This modifies the geometry
   * coordinates in place.
   * @param {number} angle Rotation angle in radians.
   * @param {import("../coordinate.js").Coordinate} anchor The rotation center.
   * @api
   * @override
   */
  rotate(angle, anchor) {
    const geometries = this.geometries_;
    for (let i = 0, ii = geometries.length; i < ii; ++i) {
      geometries[i].rotate(angle, anchor);
    }
    this.changed();
  }
  /**
   * Scale the geometry (with an optional origin).  This modifies the geometry
   * coordinates in place.
   * @abstract
   * @param {number} sx The scaling factor in the x-direction.
   * @param {number} [sy] The scaling factor in the y-direction (defaults to sx).
   * @param {import("../coordinate.js").Coordinate} [anchor] The scale origin (defaults to the center
   *     of the geometry extent).
   * @api
   * @override
   */
  scale(sx, sy, anchor) {
    if (!anchor) {
      anchor = getCenter(this.getExtent());
    }
    const geometries = this.geometries_;
    for (let i = 0, ii = geometries.length; i < ii; ++i) {
      geometries[i].scale(sx, sy, anchor);
    }
    this.changed();
  }
  /**
   * Set the geometries that make up this geometry collection.
   * @param {Array<Geometry>} geometries Geometries.
   * @api
   */
  setGeometries(geometries) {
    this.setGeometriesArray(cloneGeometries(geometries));
  }
  /**
   * @param {Array<Geometry>} geometries Geometries.
   */
  setGeometriesArray(geometries) {
    this.unlistenGeometriesChange_();
    this.geometries_ = geometries;
    this.listenGeometriesChange_();
    this.changed();
  }
  /**
   * Apply a transform function to the coordinates of the geometry.
   * The geometry is modified in place.
   * If you do not want the geometry modified in place, first `clone()` it and
   * then use this function on the clone.
   * @param {import("../proj.js").TransformFunction} transformFn Transform function.
   * Called with a flat array of geometry coordinates.
   * @api
   * @override
   */
  applyTransform(transformFn) {
    const geometries = this.geometries_;
    for (let i = 0, ii = geometries.length; i < ii; ++i) {
      geometries[i].applyTransform(transformFn);
    }
    this.changed();
  }
  /**
   * Translate the geometry.  This modifies the geometry coordinates in place.  If
   * instead you want a new geometry, first `clone()` this geometry.
   * @param {number} deltaX Delta X.
   * @param {number} deltaY Delta Y.
   * @api
   * @override
   */
  translate(deltaX, deltaY) {
    const geometries = this.geometries_;
    for (let i = 0, ii = geometries.length; i < ii; ++i) {
      geometries[i].translate(deltaX, deltaY);
    }
    this.changed();
  }
  /**
   * Clean up.
   * @override
   */
  disposeInternal() {
    this.unlistenGeometriesChange_();
    super.disposeInternal();
  }
};
function cloneGeometries(geometries) {
  return geometries.map((geometry) => geometry.clone());
}
var GeometryCollection_default = GeometryCollection;

// node_modules/ol/format/Feature.js
var FeatureFormat = class {
  constructor() {
    this.dataProjection = void 0;
    this.defaultFeatureProjection = void 0;
    this.featureClass = /** @type {FeatureToFeatureClass<FeatureType>} */
    Feature_default;
    this.supportedMediaTypes = null;
  }
  /**
   * Adds the data projection to the read options.
   * @param {Document|Element|Object|string} source Source.
   * @param {ReadOptions} [options] Options.
   * @return {ReadOptions|undefined} Options.
   * @protected
   */
  getReadOptions(source, options) {
    if (options) {
      let dataProjection = options.dataProjection ? get(options.dataProjection) : this.readProjection(source);
      if (options.extent && dataProjection && dataProjection.getUnits() === "tile-pixels") {
        dataProjection = get(dataProjection);
        dataProjection.setWorldExtent(options.extent);
      }
      options = {
        dataProjection,
        featureProjection: options.featureProjection
      };
    }
    return this.adaptOptions(options);
  }
  /**
   * Sets the `dataProjection` on the options, if no `dataProjection`
   * is set.
   * @param {WriteOptions|ReadOptions|undefined} options
   *     Options.
   * @protected
   * @return {WriteOptions|ReadOptions|undefined}
   *     Updated options.
   */
  adaptOptions(options) {
    return Object.assign(
      {
        dataProjection: this.dataProjection,
        featureProjection: this.defaultFeatureProjection,
        featureClass: this.featureClass
      },
      options
    );
  }
  /**
   * @abstract
   * @return {Type} The format type.
   */
  getType() {
    return abstract();
  }
  /**
   * Read a single feature from a source.
   *
   * @abstract
   * @param {Document|Element|Object|string} source Source.
   * @param {ReadOptions} [options] Read options.
   * @return {FeatureType|Array<FeatureType>} Feature.
   */
  readFeature(source, options) {
    return abstract();
  }
  /**
   * Read all features from a source.
   *
   * @abstract
   * @param {Document|Element|ArrayBuffer|Object|string} source Source.
   * @param {ReadOptions} [options] Read options.
   * @return {Array<FeatureType>} Features.
   */
  readFeatures(source, options) {
    return abstract();
  }
  /**
   * Read a single geometry from a source.
   *
   * @abstract
   * @param {Document|Element|Object|string} source Source.
   * @param {ReadOptions} [options] Read options.
   * @return {import("../geom/Geometry.js").default} Geometry.
   */
  readGeometry(source, options) {
    return abstract();
  }
  /**
   * Read the projection from a source.
   *
   * @abstract
   * @param {Document|Element|Object|string} source Source.
   * @return {import("../proj/Projection.js").default|undefined} Projection.
   */
  readProjection(source) {
    return abstract();
  }
  /**
   * Encode a feature in this format.
   *
   * @abstract
   * @param {Feature} feature Feature.
   * @param {WriteOptions} [options] Write options.
   * @return {string|ArrayBuffer} Result.
   */
  writeFeature(feature, options) {
    return abstract();
  }
  /**
   * Encode an array of features in this format.
   *
   * @abstract
   * @param {Array<Feature>} features Features.
   * @param {WriteOptions} [options] Write options.
   * @return {string|ArrayBuffer} Result.
   */
  writeFeatures(features, options) {
    return abstract();
  }
  /**
   * Write a single geometry in this format.
   *
   * @abstract
   * @param {import("../geom/Geometry.js").default} geometry Geometry.
   * @param {WriteOptions} [options] Write options.
   * @return {string|ArrayBuffer} Result.
   */
  writeGeometry(geometry, options) {
    return abstract();
  }
};
var Feature_default3 = FeatureFormat;
function transformGeometryWithOptions(geometry, write, options) {
  const featureProjection = options ? get(options.featureProjection) : null;
  const dataProjection = options ? get(options.dataProjection) : null;
  let transformed = geometry;
  if (featureProjection && dataProjection && !equivalent(featureProjection, dataProjection)) {
    if (write) {
      transformed = /** @type {T} */
      geometry.clone();
    }
    const fromProjection = write ? featureProjection : dataProjection;
    const toProjection = write ? dataProjection : featureProjection;
    if (fromProjection.getUnits() === "tile-pixels") {
      transformed.transform(fromProjection, toProjection);
    } else {
      transformed.applyTransform(getTransform(fromProjection, toProjection));
    }
  }
  if (write && options && /** @type {WriteOptions} */
  options.decimals !== void 0) {
    const power = Math.pow(
      10,
      /** @type {WriteOptions} */
      options.decimals
    );
    const transform = function(coordinates) {
      for (let i = 0, ii = coordinates.length; i < ii; ++i) {
        coordinates[i] = Math.round(coordinates[i] * power) / power;
      }
      return coordinates;
    };
    if (transformed === geometry) {
      transformed = /** @type {T} */
      geometry.clone();
    }
    transformed.applyTransform(transform);
  }
  return transformed;
}
var GeometryConstructor = {
  Point: Point_default,
  LineString: LineString_default,
  Polygon: Polygon_default,
  MultiPoint: MultiPoint_default,
  MultiLineString: MultiLineString_default,
  MultiPolygon: MultiPolygon_default
};
function orientFlatCoordinates(flatCoordinates, ends, stride) {
  if (Array.isArray(ends[0])) {
    if (!linearRingssAreOriented(flatCoordinates, 0, ends, stride)) {
      flatCoordinates = flatCoordinates.slice();
      orientLinearRingsArray(flatCoordinates, 0, ends, stride);
    }
    return flatCoordinates;
  }
  if (!linearRingsAreOriented(flatCoordinates, 0, ends, stride)) {
    flatCoordinates = flatCoordinates.slice();
    orientLinearRings(flatCoordinates, 0, ends, stride);
  }
  return flatCoordinates;
}
function createRenderFeature(object, options) {
  var _a;
  const geometry = object.geometry;
  if (!geometry) {
    return [];
  }
  if (Array.isArray(geometry)) {
    return geometry.map((geometry2) => createRenderFeature({ ...object, geometry: geometry2 })).flat();
  }
  const geometryType = geometry.type === "MultiPolygon" ? "Polygon" : geometry.type;
  if (geometryType === "GeometryCollection" || geometryType === "Circle") {
    throw new Error("Unsupported geometry type: " + geometryType);
  }
  const stride = geometry.layout.length;
  return transformGeometryWithOptions(
    new Feature_default2(
      geometryType,
      geometryType === "Polygon" ? orientFlatCoordinates(geometry.flatCoordinates, geometry.ends, stride) : geometry.flatCoordinates,
      (_a = geometry.ends) == null ? void 0 : _a.flat(),
      stride,
      object.properties || {},
      object.id
    ).enableSimplifyTransformed(),
    false,
    options
  );
}
function createGeometry(object, options) {
  if (!object) {
    return null;
  }
  if (Array.isArray(object)) {
    const geometries = object.map(
      (geometry) => createGeometry(geometry, options)
    );
    return new GeometryCollection_default(geometries);
  }
  const Geometry = GeometryConstructor[object.type];
  return transformGeometryWithOptions(
    new Geometry(object.flatCoordinates, object.layout || "XY", object.ends),
    false,
    options
  );
}

// node_modules/ol/format/JSONFeature.js
var JSONFeature = class extends Feature_default3 {
  constructor() {
    super();
  }
  /**
   * @return {import("./Feature.js").Type} Format.
   * @override
   */
  getType() {
    return "json";
  }
  /**
   * Read a feature.  Only works for a single feature. Use `readFeatures` to
   * read a feature collection.
   *
   * @param {ArrayBuffer|Document|Element|Object|string} source Source.
   * @param {import("./Feature.js").ReadOptions} [options] Read options.
   * @return {FeatureType|Array<FeatureType>} Feature.
   * @api
   * @override
   */
  readFeature(source, options) {
    return this.readFeatureFromObject(
      getObject(source),
      this.getReadOptions(source, options)
    );
  }
  /**
   * Read all features.  Works with both a single feature and a feature
   * collection.
   *
   * @param {ArrayBuffer|Document|Element|Object|string} source Source.
   * @param {import("./Feature.js").ReadOptions} [options] Read options.
   * @return {Array<FeatureType>} Features.
   * @api
   * @override
   */
  readFeatures(source, options) {
    return this.readFeaturesFromObject(
      getObject(source),
      this.getReadOptions(source, options)
    );
  }
  /**
   * @abstract
   * @param {Object} object Object.
   * @param {import("./Feature.js").ReadOptions} [options] Read options.
   * @protected
   * @return {FeatureType|Array<FeatureType>} Feature.
   */
  readFeatureFromObject(object, options) {
    return abstract();
  }
  /**
   * @abstract
   * @param {Object} object Object.
   * @param {import("./Feature.js").ReadOptions} [options] Read options.
   * @protected
   * @return {Array<FeatureType>} Features.
   */
  readFeaturesFromObject(object, options) {
    return abstract();
  }
  /**
   * Read a geometry.
   *
   * @param {ArrayBuffer|Document|Element|Object|string} source Source.
   * @param {import("./Feature.js").ReadOptions} [options] Read options.
   * @return {import("../geom/Geometry.js").default} Geometry.
   * @api
   * @override
   */
  readGeometry(source, options) {
    return this.readGeometryFromObject(
      getObject(source),
      this.getReadOptions(source, options)
    );
  }
  /**
   * @abstract
   * @param {Object} object Object.
   * @param {import("./Feature.js").ReadOptions} [options] Read options.
   * @protected
   * @return {import("../geom/Geometry.js").default} Geometry.
   */
  readGeometryFromObject(object, options) {
    return abstract();
  }
  /**
   * Read the projection.
   *
   * @param {ArrayBuffer|Document|Element|Object|string} source Source.
   * @return {import("../proj/Projection.js").default} Projection.
   * @api
   * @override
   */
  readProjection(source) {
    return this.readProjectionFromObject(getObject(source));
  }
  /**
   * @abstract
   * @param {Object} object Object.
   * @protected
   * @return {import("../proj/Projection.js").default} Projection.
   */
  readProjectionFromObject(object) {
    return abstract();
  }
  /**
   * Encode a feature as string.
   *
   * @param {import("../Feature.js").default} feature Feature.
   * @param {import("./Feature.js").WriteOptions} [options] Write options.
   * @return {string} Encoded feature.
   * @api
   * @override
   */
  writeFeature(feature, options) {
    return JSON.stringify(this.writeFeatureObject(feature, options));
  }
  /**
   * @abstract
   * @param {import("../Feature.js").default} feature Feature.
   * @param {import("./Feature.js").WriteOptions} [options] Write options.
   * @return {Object} Object.
   */
  writeFeatureObject(feature, options) {
    return abstract();
  }
  /**
   * Encode an array of features as string.
   *
   * @param {Array<import("../Feature.js").default>} features Features.
   * @param {import("./Feature.js").WriteOptions} [options] Write options.
   * @return {string} Encoded features.
   * @api
   * @override
   */
  writeFeatures(features, options) {
    return JSON.stringify(this.writeFeaturesObject(features, options));
  }
  /**
   * @abstract
   * @param {Array<import("../Feature.js").default>} features Features.
   * @param {import("./Feature.js").WriteOptions} [options] Write options.
   * @return {Object} Object.
   */
  writeFeaturesObject(features, options) {
    return abstract();
  }
  /**
   * Encode a geometry as string.
   *
   * @param {import("../geom/Geometry.js").default} geometry Geometry.
   * @param {import("./Feature.js").WriteOptions} [options] Write options.
   * @return {string} Encoded geometry.
   * @api
   * @override
   */
  writeGeometry(geometry, options) {
    return JSON.stringify(this.writeGeometryObject(geometry, options));
  }
  /**
   * @abstract
   * @param {import("../geom/Geometry.js").default} geometry Geometry.
   * @param {import("./Feature.js").WriteOptions} [options] Write options.
   * @return {Object} Object.
   */
  writeGeometryObject(geometry, options) {
    return abstract();
  }
};
function getObject(source) {
  if (typeof source === "string") {
    const object = JSON.parse(source);
    return object ? (
      /** @type {Object} */
      object
    ) : null;
  }
  if (source !== null) {
    return source;
  }
  return null;
}
var JSONFeature_default = JSONFeature;

// node_modules/ol/format/GeoJSON.js
var GeoJSON = class extends JSONFeature_default {
  /**
   * @param {Options<FeatureType>} [options] Options.
   */
  constructor(options) {
    options = options ? options : {};
    super();
    this.dataProjection = get(
      options.dataProjection ? options.dataProjection : "EPSG:4326"
    );
    if (options.featureProjection) {
      this.defaultFeatureProjection = get(options.featureProjection);
    }
    if (options.featureClass) {
      this.featureClass = options.featureClass;
    }
    this.geometryName_ = options.geometryName;
    this.extractGeometryName_ = options.extractGeometryName;
    this.supportedMediaTypes = [
      "application/geo+json",
      "application/vnd.geo+json"
    ];
  }
  /**
   * @param {Object} object Object.
   * @param {import("./Feature.js").ReadOptions} [options] Read options.
   * @protected
   * @return {FeatureType|Array<FeatureType>} Feature.
   * @override
   */
  readFeatureFromObject(object, options) {
    let geoJSONFeature = null;
    if (object["type"] === "Feature") {
      geoJSONFeature = /** @type {GeoJSONFeature} */
      object;
    } else {
      geoJSONFeature = {
        "type": "Feature",
        "geometry": (
          /** @type {GeoJSONGeometry} */
          object
        ),
        "properties": null
      };
    }
    const geometry = readGeometryInternal(geoJSONFeature["geometry"], options);
    if (this.featureClass === Feature_default2) {
      return (
        /** @type {FeatureType|Array<FeatureType>} */
        createRenderFeature(
          {
            geometry,
            id: geoJSONFeature["id"],
            properties: geoJSONFeature["properties"]
          },
          options
        )
      );
    }
    const feature = new Feature_default();
    if (this.geometryName_) {
      feature.setGeometryName(this.geometryName_);
    } else if (this.extractGeometryName_ && geoJSONFeature["geometry_name"]) {
      feature.setGeometryName(geoJSONFeature["geometry_name"]);
    }
    feature.setGeometry(createGeometry(geometry, options));
    if ("id" in geoJSONFeature) {
      feature.setId(geoJSONFeature["id"]);
    }
    if (geoJSONFeature["properties"]) {
      feature.setProperties(geoJSONFeature["properties"], true);
    }
    return (
      /** @type {FeatureType|Array<FeatureType>} */
      feature
    );
  }
  /**
   * @param {Object} object Object.
   * @param {import("./Feature.js").ReadOptions} [options] Read options.
   * @protected
   * @return {Array<FeatureType>} Features.
   * @override
   */
  readFeaturesFromObject(object, options) {
    const geoJSONObject = (
      /** @type {GeoJSONObject} */
      object
    );
    let features = null;
    if (geoJSONObject["type"] === "FeatureCollection") {
      const geoJSONFeatureCollection = (
        /** @type {GeoJSONFeatureCollection} */
        object
      );
      features = [];
      const geoJSONFeatures = geoJSONFeatureCollection["features"];
      for (let i = 0, ii = geoJSONFeatures.length; i < ii; ++i) {
        const featureObject = this.readFeatureFromObject(
          geoJSONFeatures[i],
          options
        );
        if (!featureObject) {
          continue;
        }
        features.push(featureObject);
      }
    } else {
      features = [this.readFeatureFromObject(object, options)];
    }
    return (
      /** @type {Array<FeatureType>} */
      features.flat()
    );
  }
  /**
   * @param {GeoJSONGeometry} object Object.
   * @param {import("./Feature.js").ReadOptions} [options] Read options.
   * @protected
   * @return {import("../geom/Geometry.js").default} Geometry.
   * @override
   */
  readGeometryFromObject(object, options) {
    return readGeometry(object, options);
  }
  /**
   * @param {Object} object Object.
   * @protected
   * @return {import("../proj/Projection.js").default} Projection.
   * @override
   */
  readProjectionFromObject(object) {
    const crs = object["crs"];
    let projection;
    if (crs) {
      if (crs["type"] == "name") {
        projection = get(crs["properties"]["name"]);
      } else if (crs["type"] === "EPSG") {
        projection = get("EPSG:" + crs["properties"]["code"]);
      } else {
        throw new Error("Unknown SRS type");
      }
    } else {
      projection = this.dataProjection;
    }
    return (
      /** @type {import("../proj/Projection.js").default} */
      projection
    );
  }
  /**
   * Encode a feature as a GeoJSON Feature object.
   *
   * @param {import("../Feature.js").default} feature Feature.
   * @param {import("./Feature.js").WriteOptions} [options] Write options.
   * @return {GeoJSONFeature} Object.
   * @api
   * @override
   */
  writeFeatureObject(feature, options) {
    options = this.adaptOptions(options);
    const object = {
      "type": "Feature",
      geometry: null,
      properties: null
    };
    const id = feature.getId();
    if (id !== void 0) {
      object.id = id;
    }
    if (!feature.hasProperties()) {
      return object;
    }
    const properties = feature.getProperties();
    const geometry = feature.getGeometry();
    if (geometry) {
      object.geometry = writeGeometry(geometry, options);
      delete properties[feature.getGeometryName()];
    }
    if (!isEmpty(properties)) {
      object.properties = properties;
    }
    return object;
  }
  /**
   * Encode an array of features as a GeoJSON object.
   *
   * @param {Array<import("../Feature.js").default>} features Features.
   * @param {import("./Feature.js").WriteOptions} [options] Write options.
   * @return {GeoJSONFeatureCollection} GeoJSON Object.
   * @api
   * @override
   */
  writeFeaturesObject(features, options) {
    options = this.adaptOptions(options);
    const objects = [];
    for (let i = 0, ii = features.length; i < ii; ++i) {
      objects.push(this.writeFeatureObject(features[i], options));
    }
    return {
      type: "FeatureCollection",
      features: objects
    };
  }
  /**
   * Encode a geometry as a GeoJSON object.
   *
   * @param {import("../geom/Geometry.js").default} geometry Geometry.
   * @param {import("./Feature.js").WriteOptions} [options] Write options.
   * @return {GeoJSONGeometry|GeoJSONGeometryCollection} Object.
   * @api
   * @override
   */
  writeGeometryObject(geometry, options) {
    return writeGeometry(geometry, this.adaptOptions(options));
  }
};
function readGeometryInternal(object, options) {
  if (!object) {
    return null;
  }
  let geometry;
  switch (object["type"]) {
    case "Point": {
      geometry = readPointGeometry(
        /** @type {GeoJSONPoint} */
        object
      );
      break;
    }
    case "LineString": {
      geometry = readLineStringGeometry(
        /** @type {GeoJSONLineString} */
        object
      );
      break;
    }
    case "Polygon": {
      geometry = readPolygonGeometry(
        /** @type {GeoJSONPolygon} */
        object
      );
      break;
    }
    case "MultiPoint": {
      geometry = readMultiPointGeometry(
        /** @type {GeoJSONMultiPoint} */
        object
      );
      break;
    }
    case "MultiLineString": {
      geometry = readMultiLineStringGeometry(
        /** @type {GeoJSONMultiLineString} */
        object
      );
      break;
    }
    case "MultiPolygon": {
      geometry = readMultiPolygonGeometry(
        /** @type {GeoJSONMultiPolygon} */
        object
      );
      break;
    }
    case "GeometryCollection": {
      geometry = readGeometryCollectionGeometry(
        /** @type {GeoJSONGeometryCollection} */
        object
      );
      break;
    }
    default: {
      throw new Error("Unsupported GeoJSON type: " + object["type"]);
    }
  }
  return geometry;
}
function readGeometry(object, options) {
  const geometryObject = readGeometryInternal(object, options);
  return createGeometry(geometryObject, options);
}
function readGeometryCollectionGeometry(object, options) {
  const geometries = object["geometries"].map(
    /**
     * @param {GeoJSONGeometry} geometry Geometry.
     * @return {import("./Feature.js").GeometryObject} geometry Geometry.
     */
    function(geometry) {
      return readGeometryInternal(geometry, options);
    }
  );
  return geometries;
}
function readPointGeometry(object) {
  const flatCoordinates = object["coordinates"];
  return {
    type: "Point",
    flatCoordinates,
    layout: getLayoutForStride(flatCoordinates.length)
  };
}
function readLineStringGeometry(object) {
  var _a;
  const coordinates = object["coordinates"];
  const flatCoordinates = coordinates.flat();
  return {
    type: "LineString",
    flatCoordinates,
    ends: [flatCoordinates.length],
    layout: getLayoutForStride(((_a = coordinates[0]) == null ? void 0 : _a.length) || 2)
  };
}
function readMultiLineStringGeometry(object) {
  var _a, _b;
  const coordinates = object["coordinates"];
  const stride = ((_b = (_a = coordinates[0]) == null ? void 0 : _a[0]) == null ? void 0 : _b.length) || 2;
  const flatCoordinates = [];
  const ends = deflateCoordinatesArray(flatCoordinates, 0, coordinates, stride);
  return {
    type: "MultiLineString",
    flatCoordinates,
    ends,
    layout: getLayoutForStride(stride)
  };
}
function readMultiPointGeometry(object) {
  var _a;
  const coordinates = object["coordinates"];
  return {
    type: "MultiPoint",
    flatCoordinates: coordinates.flat(),
    layout: getLayoutForStride(((_a = coordinates[0]) == null ? void 0 : _a.length) || 2)
  };
}
function readMultiPolygonGeometry(object) {
  var _a, _b;
  const coordinates = object["coordinates"];
  const flatCoordinates = [];
  const stride = ((_b = (_a = coordinates[0]) == null ? void 0 : _a[0]) == null ? void 0 : _b[0].length) || 2;
  const endss = deflateMultiCoordinatesArray(
    flatCoordinates,
    0,
    coordinates,
    stride
  );
  return {
    type: "MultiPolygon",
    flatCoordinates,
    ends: endss,
    layout: getLayoutForStride(stride)
  };
}
function readPolygonGeometry(object) {
  var _a, _b;
  const coordinates = object["coordinates"];
  const flatCoordinates = [];
  const stride = (_b = (_a = coordinates[0]) == null ? void 0 : _a[0]) == null ? void 0 : _b.length;
  const ends = deflateCoordinatesArray(flatCoordinates, 0, coordinates, stride);
  return {
    type: "Polygon",
    flatCoordinates,
    ends,
    layout: getLayoutForStride(stride)
  };
}
function writeGeometry(geometry, options) {
  geometry = transformGeometryWithOptions(geometry, true, options);
  const type = geometry.getType();
  let geoJSON;
  switch (type) {
    case "Point": {
      geoJSON = writePointGeometry(
        /** @type {import("../geom/Point.js").default} */
        geometry,
        options
      );
      break;
    }
    case "LineString": {
      geoJSON = writeLineStringGeometry(
        /** @type {import("../geom/LineString.js").default} */
        geometry,
        options
      );
      break;
    }
    case "Polygon": {
      geoJSON = writePolygonGeometry(
        /** @type {import("../geom/Polygon.js").default} */
        geometry,
        options
      );
      break;
    }
    case "MultiPoint": {
      geoJSON = writeMultiPointGeometry(
        /** @type {import("../geom/MultiPoint.js").default} */
        geometry,
        options
      );
      break;
    }
    case "MultiLineString": {
      geoJSON = writeMultiLineStringGeometry(
        /** @type {import("../geom/MultiLineString.js").default} */
        geometry,
        options
      );
      break;
    }
    case "MultiPolygon": {
      geoJSON = writeMultiPolygonGeometry(
        /** @type {import("../geom/MultiPolygon.js").default} */
        geometry,
        options
      );
      break;
    }
    case "GeometryCollection": {
      geoJSON = writeGeometryCollectionGeometry(
        /** @type {import("../geom/GeometryCollection.js").default} */
        geometry,
        options
      );
      break;
    }
    case "Circle": {
      geoJSON = {
        type: "GeometryCollection",
        geometries: []
      };
      break;
    }
    default: {
      throw new Error("Unsupported geometry type: " + type);
    }
  }
  return geoJSON;
}
function writeGeometryCollectionGeometry(geometry, options) {
  options = Object.assign({}, options);
  delete options.featureProjection;
  const geometries = geometry.getGeometriesArray().map(function(geometry2) {
    return writeGeometry(geometry2, options);
  });
  return {
    type: "GeometryCollection",
    geometries
  };
}
function writeLineStringGeometry(geometry, options) {
  return {
    type: "LineString",
    coordinates: geometry.getCoordinates()
  };
}
function writeMultiLineStringGeometry(geometry, options) {
  return {
    type: "MultiLineString",
    coordinates: geometry.getCoordinates()
  };
}
function writeMultiPointGeometry(geometry, options) {
  return {
    type: "MultiPoint",
    coordinates: geometry.getCoordinates()
  };
}
function writeMultiPolygonGeometry(geometry, options) {
  let right;
  if (options) {
    right = options.rightHanded;
  }
  return {
    type: "MultiPolygon",
    coordinates: geometry.getCoordinates(right)
  };
}
function writePointGeometry(geometry, options) {
  return {
    type: "Point",
    coordinates: geometry.getCoordinates()
  };
}
function writePolygonGeometry(geometry, options) {
  let right;
  if (options) {
    right = options.rightHanded;
  }
  return {
    type: "Polygon",
    coordinates: geometry.getCoordinates(right)
  };
}
var GeoJSON_default = GeoJSON;
export {
  GeoJSON_default as default
};
//# sourceMappingURL=ol_format_GeoJSON.js.map
