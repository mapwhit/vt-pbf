const Point = require('@mapbox/point-geometry');
const VectorTileFeature = require('@mapwhit/vector-tile').VectorTileFeature;

// conform to vectortile api
class FeatureWrapper {
  constructor({ id, type, geometry, tags }) {
    this.id = typeof id === 'number' ? id : undefined;
    this.type = type;
    this.rawGeometry = type === 1 ? [geometry] : geometry;
    this.properties = tags;
  }

  loadGeometry() {
    const rings = this.rawGeometry;
    this.geometry = [];

    rings.forEach(ring => {
      const newRing = [];
      for (let j = 0; j < ring.length; j++) {
        newRing.push(new Point(ring[j][0], ring[j][1]));
      }
      this.geometry.push(newRing);
    });

    return this.geometry;
  }

  bbox() {
    if (!this.geometry) this.loadGeometry();

    const rings = this.geometry;
    let x1 = Number.POSITIVE_INFINITY;
    let x2 = Number.NEGATIVE_INFINITY;
    let y1 = Number.POSITIVE_INFINITY;
    let y2 = Number.NEGATIVE_INFINITY;

    rings.forEach(ring => {
      ring.forEach(coord => {
        x1 = Math.min(x1, coord.x);
        x2 = Math.max(x2, coord.x);
        y1 = Math.min(y1, coord.y);
        y2 = Math.max(y2, coord.y);
      });
    });

    return [x1, y1, x2, y2];
  }
}

FeatureWrapper.prototype.toGeoJSON = VectorTileFeature.prototype.toGeoJSON;

class GeoJSONWrapper {
  constructor(features, options = {}) {
    this.options = options;
    this.features = features;
    this.length = features.length;
  }

  feature(i) {
    return new FeatureWrapper(this.features[i]);
  }
}

module.exports = GeoJSONWrapper;
