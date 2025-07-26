import Point from '@mapbox/point-geometry';
import { VectorTileFeature } from '@mapwhit/vector-tile';

// conform to vectortile api
class FeatureWrapper {
  constructor({ id, type, geometry, tags }) {
    this.id = typeof id === 'number' ? id : undefined;
    this.type = type;
    this.rawGeometry = type === 1 ? [geometry] : geometry;
    this.properties = tags;
    this.geometry = undefined;
  }

  loadGeometry() {
    this.geometry = this.rawGeometry.map(ring => ring.map(p => new Point(p[0], p[1])));
    return this.geometry;
  }

  bbox() {
    const rings = this.geometry ?? this.loadGeometry();
    let x1 = Number.POSITIVE_INFINITY;
    let x2 = Number.NEGATIVE_INFINITY;
    let y1 = Number.POSITIVE_INFINITY;
    let y2 = Number.NEGATIVE_INFINITY;

    for (const ring of rings) {
      for (const coord of ring) {
        if (x1 > coord.x) x1 = coord.x;
        if (x2 < coord.x) x2 = coord.x;
        if (y1 > coord.y) y1 = coord.y;
        if (y2 < coord.y) y2 = coord.y;
      }
    }

    return [x1, y1, x2, y2];
  }
}

FeatureWrapper.prototype.toGeoJSON = VectorTileFeature.prototype.toGeoJSON;

export default class GeoJSONWrapper {
  constructor(features, options = {}, name = '') {
    this.options = options;
    this.features = features;
    this.name = name;
  }

  get version() {
    return this.options.version;
  }

  get extent() {
    return this.options.extent;
  }

  get length() {
    return this.features.length;
  }

  feature(i) {
    return new FeatureWrapper(this.features[i]);
  }
}
