const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const Pbf = require('pbf')
const geojsonVt = require('geojson-vt')
const VectorTile = require('@mapwhit/vector-tile').VectorTile
const GeoJsonEquality = require('geojson-equality')

const eq = new GeoJsonEquality({ precision: 1 })

const vtpbf = require('../')

global.DEBUG = true

test('property encoding', async function (t) {
  await t.test('property encoding: JSON.stringify non-primitive values', function (t) {
    // Includes two properties with a common non-primitive value for
    // https://github.com/mapbox/vt-pbf/issues/9
    const orig = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {
          a: 'one',
          b: 1,
          c: { hello: 'world' },
          d: [1, 2, 3],
          e: null
        },
        geometry: {
          type: 'Point',
          coordinates: [0, 0]
        }
      }, {
        type: 'Feature',
        properties: {
          a: 'two',
          b: 2,
          c: { goodbye: 'planet' },
          d: { hello: 'world' }
        },
        geometry: {
          type: 'Point',
          coordinates: [0, 0]
        }
      }]
    }

    const tileindex = geojsonVt(orig)
    const tile = tileindex.getTile(1, 0, 0)
    const buff = vtpbf.fromGeojsonVt({ geojsonLayer: tile })

    const vt = new VectorTile(new Pbf(buff))
    const layer = vt.layers.geojsonLayer

    const first = layer.feature(0).properties
    const second = layer.feature(1).properties
    assert.deepEqual(first.c, '{"hello":"world"}')
    assert.deepEqual(first.d, '[1,2,3]')
    assert.equal(first.e, undefined)
    assert.deepEqual(second.c, '{"goodbye":"planet"}')
    assert.deepEqual(second.d, '{"hello":"world"}')
  })

  await t.test('number encoding https://github.com/mapbox/vt-pbf/pull/11', function (t) {
    const orig = {
      type: 'Feature',
      properties: {
        large_integer: 39953616224,
        non_integer: 331.75415
      },
      geometry: {
        type: 'Point',
        coordinates: [0, 0]
      }
    }

    const tileindex = geojsonVt(orig)
    const tile = tileindex.getTile(1, 0, 0)
    const buff = vtpbf.fromGeojsonVt({ geojsonLayer: tile })
    const vt = new VectorTile(new Pbf(buff))
    const layer = vt.layers.geojsonLayer

    const properties = layer.feature(0).properties
    assert.equal(properties.large_integer, 39953616224)
    assert.equal(properties.non_integer, 331.75415)
  })
})

test('id encoding', function (t) {
  const orig = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      id: 123,
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [0, 0]
      }
    }, {
      type: 'Feature',
      id: 'invalid',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [0, 0]
      }
    }, {
      type: 'Feature',
      // no id
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [0, 0]
      }
    }]
  }
  const tileindex = geojsonVt(orig)
  const tile = tileindex.getTile(1, 0, 0)
  const buff = vtpbf.fromGeojsonVt({ geojsonLayer: tile })
  const vt = new VectorTile(new Pbf(buff))
  const layer = vt.layers.geojsonLayer
  assert.deepEqual(layer.feature(0).id, 123)
  assert.ok(!layer.feature(1).id, 'Non-integer values should not be saved')
  assert.ok(!layer.feature(2).id)
})

test('accept geojson-vt options https://github.com/mapbox/vt-pbf/pull/21', function (t) {
  const version = 2
  const extent = 8192
  const orig = JSON.parse(fs.readFileSync(path.join(__dirname, '/fixtures/rectangle.geojson')))
  const tileindex = geojsonVt(orig, { extent })
  const tile = tileindex.getTile(1, 0, 0)
  const options = { version, extent }
  const buff = vtpbf.fromGeojsonVt({ geojsonLayer: tile }, options)

  const vt = new VectorTile(new Pbf(buff))
  const layer = vt.layers.geojsonLayer
  const features = []
  for (let i = 0; i < layer.length; i++) {
    const feat = layer.feature(i).toGeoJSON(0, 0, 1)
    features.push(feat)
  }

  assert.equal(layer.version, options.version, 'version should be equal')
  assert.equal(layer.extent, options.extent, 'extent should be equal')

  orig.features.forEach(function (expected) {
    const actual = features.shift()
    assert.ok(eq.compare(actual, expected))
  })
})
