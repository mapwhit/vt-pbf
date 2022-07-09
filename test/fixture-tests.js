const test = require('tape').test
const geojsonVt = require('geojson-vt')
const VectorTile = require('@mapbox/vector-tile').VectorTile
const Pbf = require('pbf')
const vtvalidate = require('@mapbox/vtvalidate')
const geojsonFixtures = require('@mapbox/geojson-fixtures')
const mvtf = require('@mapbox/mvt-fixtures')
const GeoJsonEquality = require('geojson-equality')
const eq = new GeoJsonEquality({ precision: 1 })

const vtpbf = require('../')

test('geojson-vt', function (t) {
  const geometryTypes = ['polygon', 'point', 'multipoint', 'multipolygon', 'polygon', 'multilinestring']

  const fixtures = geometryTypes.map(function (type) {
    return {
      name: type,
      data: { type: 'Feature', properties: {}, geometry: geojsonFixtures.geometry[type] }
    }
  })

  fixtures.forEach(function (fixture) {
    t.test(fixture.name, function (t) {
      const tile = geojsonVt(fixture.data).getTile(0, 0, 0)
      const buff = vtpbf.fromGeojsonVt({ geojsonLayer: tile })
      vtvalidate.isValid(buff, (err, invalid) => {
        t.error(err)

        t.ok(!invalid, invalid)

        // Compare roundtripped features with originals
        const expected = fixture.data.type === 'FeatureCollection' ? fixture.data.features : [fixture.data]
        const layer = new VectorTile(new Pbf(buff)).layers.geojsonLayer
        t.equal(layer.length, expected.length, expected.length + ' features')
        for (let i = 0; i < layer.length; i++) {
          const actual = layer.feature(i).toGeoJSON(0, 0, 0)
          t.ok(eq.compare(actual, expected[i]), 'feature ' + i)
        }
        t.end()
      })
    })
  })

  t.end()
})

test('vector-tile-js', function (t) {
  // See https://github.com/mapbox/mvt-fixtures/blob/master/FIXTURES.md for
  // fixture descriptions
  mvtf.each(function (fixture) {
    // skip invalid tiles
    if (!fixture.validity.v2) return

    t.test('mvt-fixtures: ' + fixture.id + ' ' + fixture.description, function (t) {
      const original = new VectorTile(new Pbf(fixture.buffer))

      if (fixture.id === '020') {
        t.comment('Skipping test due to https://github.com/mapbox/vt-pbf/issues/30')
        t.end()
        return
      }

      if (fixture.id === '049' || fixture.id === '050') {
        t.comment('Skipping test due to https://github.com/mapbox/vt-pbf/issues/31')
        t.end()
        return
      }

      const buff = vtpbf(original)
      const roundtripped = new VectorTile(new Pbf(buff))

      vtvalidate.isValid(buff, (err, invalid) => {
        t.error(err)

        if (invalid && invalid === 'ClosePath command count is not 1') {
          t.comment('Skipping test due to https://github.com/mapbox/vt-pbf/issues/28')
          t.end()
          return
        }

        // UNKOWN geometry type is valid in the spec, but vtvalidate considers
        // it an error
        if (fixture.id === '016' || fixture.id === '039') {
          invalid = null
        }

        t.ok(!invalid, invalid)

        // Compare roundtripped features with originals
        for (const name in original.layers) {
          const originalLayer = original.layers[name]
          t.ok(roundtripped.layers[name], 'layer ' + name)
          const roundtrippedLayer = roundtripped.layers[name]
          t.equal(roundtrippedLayer.length, originalLayer.length)
          for (let i = 0; i < originalLayer.length; i++) {
            const actual = roundtrippedLayer.feature(i)
            const expected = originalLayer.feature(i)

            t.equal(actual.id, expected.id, 'id')
            t.equal(actual.type, expected.type, 'type')
            t.deepEqual(actual.properties, expected.properties, 'properties')
            t.deepEqual(actual.loadGeometry(), expected.loadGeometry(), 'geometry')
          }
        }

        t.end()
      })
    })
  })
  t.end()
})
