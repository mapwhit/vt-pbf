const test = require('node:test')
const assert = require('node:assert')
const geojsonVt = require('geojson-vt')
const VectorTile = require('@mapbox/vector-tile').VectorTile
const Pbf = require('pbf')
const vtvalidate = require('@mapbox/vtvalidate')
const geojsonFixtures = require('@mapbox/geojson-fixtures')
const mvtf = require('@mapbox/mvt-fixtures')
const GeoJsonEquality = require('geojson-equality')
const eq = new GeoJsonEquality({ precision: 1 })

const vtpbf = require('../')

const geometryTypes = ['polygon', 'point', 'multipoint', 'multipolygon', 'polygon', 'multilinestring']

const fixtures = geometryTypes.map(function (type) {
  return {
    name: type,
    data: { type: 'Feature', properties: {}, geometry: geojsonFixtures.geometry[type] }
  }
})

fixtures.forEach(function (fixture) {
  test(fixture.name, function (t, done) {
    const tile = geojsonVt(fixture.data).getTile(0, 0, 0)
    const buff = vtpbf.fromGeojsonVt({ geojsonLayer: tile })
    vtvalidate.isValid(buff, (err, invalid) => {
      assert.ifError(err)

      assert.ok(!invalid, invalid)

      // Compare roundtripped features with originals
      const expected = fixture.data.type === 'FeatureCollection' ? fixture.data.features : [fixture.data]
      const layer = new VectorTile(new Pbf(buff)).layers.geojsonLayer
      assert.equal(layer.length, expected.length, expected.length + ' features')
      for (let i = 0; i < layer.length; i++) {
        const actual = layer.feature(i).toGeoJSON(0, 0, 0)
        assert.ok(eq.compare(actual, expected[i]), 'feature ' + i)
      }
      done()
    })
  })
})

// See https://github.com/mapbox/mvt-fixtures/blob/master/FIXTURES.md for
// fixture descriptions
mvtf.each(function (fixture) {
  // skip invalid tiles
  if (!fixture.validity.v2) return

  test('mvt-fixtures: ' + fixture.id + ' ' + fixture.description, function (t, done) {
    const original = new VectorTile(new Pbf(fixture.buffer))

    if (fixture.id === '020') {
      t.diagnostic('Skipping test due to https://github.com/mapbox/vt-pbf/issues/30')
      done()
      return
    }

    if (fixture.id === '049' || fixture.id === '050') {
      t.diagnostic('Skipping test due to https://github.com/mapbox/vt-pbf/issues/31')
      done()
      return
    }

    const buff = vtpbf(original)
    const roundtripped = new VectorTile(new Pbf(buff))

    vtvalidate.isValid(buff, (err, invalid) => {
      assert.ifError(err)

      if (invalid && invalid === 'ClosePath command count is not 1') {
        t.diagnostic('Skipping test due to https://github.com/mapbox/vt-pbf/issues/28')
        done()
        return
      }

      // UNKOWN geometry type is valid in the spec, but vtvalidate considers
      // it an error
      if (fixture.id === '016' || fixture.id === '039') {
        invalid = null
      }

      assert.ok(!invalid, invalid)

      // Compare roundtripped features with originals
      for (const name in original.layers) {
        const originalLayer = original.layers[name]
        assert.ok(roundtripped.layers[name], 'layer ' + name)
        const roundtrippedLayer = roundtripped.layers[name]
        assert.equal(roundtrippedLayer.length, originalLayer.length)
        for (let i = 0; i < originalLayer.length; i++) {
          const actual = roundtrippedLayer.feature(i)
          const expected = originalLayer.feature(i)

          assert.equal(actual.id, expected.id, 'id')
          assert.equal(actual.type, expected.type, 'type')
          assert.deepEqual(actual.properties, expected.properties, 'properties')
          assert.deepEqual(actual.loadGeometry(), expected.loadGeometry(), 'geometry')
        }
      }

      done()
    })
  })
})
