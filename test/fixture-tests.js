const test = require('node:test');
const geojsonVt = require('geojson-vt');
const VectorTile = require('@mapwhit/vector-tile').VectorTile;
const Pbf = require('pbf');
const geojsonFixtures = require('@mapbox/geojson-fixtures');
const mvtf = require('@mapbox/mvt-fixtures');
const GeoJsonEquality = require('geojson-equality');
const eq = new GeoJsonEquality({ precision: 1 });

const vtpbf = require('../');

const geometryTypes = ['polygon', 'point', 'multipoint', 'multipolygon', 'polygon', 'multilinestring'];

const fixtures = geometryTypes.map(type => ({
  name: type,
  data: { type: 'Feature', properties: {}, geometry: geojsonFixtures.geometry[type] }
}));

fixtures.forEach(fixture => {
  test(fixture.name, t => {
    const tile = geojsonVt(fixture.data).getTile(0, 0, 0);
    const buff = vtpbf.fromGeojsonVt({ geojsonLayer: tile });

    // Compare roundtripped features with originals
    const expected = fixture.data.type === 'FeatureCollection' ? fixture.data.features : [fixture.data];
    const layer = new VectorTile(new Pbf(buff)).layers.geojsonLayer;
    t.assert.equal(layer.length, expected.length, `${expected.length} features`);
    for (let i = 0; i < layer.length; i++) {
      const actual = layer.feature(i).toGeoJSON(0, 0, 0);
      t.assert.ok(eq.compare(actual, expected[i]), `feature ${i}`);
    }
  });
});

// See https://github.com/mapbox/mvt-fixtures/blob/master/FIXTURES.md for
// fixture descriptions
mvtf.each(fixture => {
  // skip invalid tiles
  if (!fixture.validity.v2) return;

  test(`mvt-fixtures: ${fixture.id} ${fixture.description}`, t => {
    const original = new VectorTile(new Pbf(fixture.buffer));

    if (fixture.id === '020') {
      t.diagnostic('Skipping test due to https://github.com/mapbox/vt-pbf/issues/30');
      return;
    }

    if (fixture.id === '049' || fixture.id === '050') {
      t.diagnostic('Skipping test due to https://github.com/mapbox/vt-pbf/issues/31');
      return;
    }

    const buff = vtpbf(original);
    const roundtripped = new VectorTile(new Pbf(buff));

    // Compare roundtripped features with originals
    for (const name in original.layers) {
      const originalLayer = original.layers[name];
      t.assert.ok(roundtripped.layers[name], `layer ${name}`);
      const roundtrippedLayer = roundtripped.layers[name];
      t.assert.equal(roundtrippedLayer.length, originalLayer.length);
      for (let i = 0; i < originalLayer.length; i++) {
        const actual = roundtrippedLayer.feature(i);
        const expected = originalLayer.feature(i);

        t.assert.equal(actual.id, expected.id, 'id');
        t.assert.equal(actual.type, expected.type, 'type');
        t.assert.deepEqual(actual.properties, expected.properties, 'properties');
        t.assert.deepEqual(actual.loadGeometry(), expected.loadGeometry(), 'geometry');
      }
    }
  });
});
