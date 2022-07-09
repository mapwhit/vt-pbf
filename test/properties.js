const fs = require('fs')
const path = require('path')
const test = require('tape').test
const Pbf = require('pbf')
const geojsonVt = require('geojson-vt')
const VectorTile = require('@mapbox/vector-tile').VectorTile
const GeoJsonEquality = require('geojson-equality')

const eq = new GeoJsonEquality({ precision: 1 })

const vtpbf = require('../')

test('property encoding', function (t) {
  test('property encoding: JSON.stringify non-primitive values', function (t) {
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
    t.same(first.c, '{"hello":"world"}')
    t.same(first.d, '[1,2,3]')
    t.equals(first.e, undefined)
    t.same(second.c, '{"goodbye":"planet"}')
    t.same(second.d, '{"hello":"world"}')
    t.end()
  })

  test('number encoding https://github.com/mapbox/vt-pbf/pull/11', function (t) {
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
    t.equal(properties.large_integer, 39953616224)
    t.equal(properties.non_integer, 331.75415)
    t.end()
  })

  t.end()
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
  t.same(layer.feature(0).id, 123)
  t.notOk(layer.feature(1).id, 'Non-integer values should not be saved')
  t.notOk(layer.feature(2).id)
  t.end()
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

  t.equal(layer.version, options.version, 'version should be equal')
  t.equal(layer.extent, options.extent, 'extent should be equal')

  orig.features.forEach(function (expected) {
    const actual = features.shift()
    t.ok(eq.compare(actual, expected))
  })

  t.end()
})
