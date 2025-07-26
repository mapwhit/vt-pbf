import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { VectorTile } from '@mapwhit/vector-tile';
import GeoJsonEquality from 'geojson-equality';
import geojsonVt from 'geojson-vt';
import Pbf from 'pbf';
import * as vtpbf from '../index.js';

const eq = new GeoJsonEquality({ precision: 1 });

global.DEBUG = true;

test('property encoding', async t => {
  await t.test('property encoding: JSON.stringify non-primitive values', t => {
    // Includes two properties with a common non-primitive value for
    // https://github.com/mapbox/vt-pbf/issues/9
    const orig = {
      type: 'FeatureCollection',
      features: [
        {
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
        },
        {
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
        }
      ]
    };

    const tileindex = geojsonVt(orig);
    const tile = tileindex.getTile(1, 0, 0);
    const buff = vtpbf.fromGeojsonVt({ geojsonLayer: tile });

    const vt = new VectorTile(new Pbf(buff));
    const layer = vt.layers.geojsonLayer;

    const first = layer.feature(0).properties;
    const second = layer.feature(1).properties;
    t.assert.deepEqual(first.c, '{"hello":"world"}');
    t.assert.deepEqual(first.d, '[1,2,3]');
    t.assert.equal(first.e, undefined);
    t.assert.deepEqual(second.c, '{"goodbye":"planet"}');
    t.assert.deepEqual(second.d, '{"hello":"world"}');
  });

  await t.test('number encoding https://github.com/mapbox/vt-pbf/pull/11', t => {
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
    };

    const tileindex = geojsonVt(orig);
    const tile = tileindex.getTile(1, 0, 0);
    const buff = vtpbf.fromGeojsonVt({ geojsonLayer: tile });
    const vt = new VectorTile(new Pbf(buff));
    const layer = vt.layers.geojsonLayer;

    const properties = layer.feature(0).properties;
    t.assert.equal(properties.large_integer, 39953616224);
    t.assert.equal(properties.non_integer, 331.75415);
  });
});

test('id encoding', t => {
  const orig = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 123,
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [0, 0]
        }
      },
      {
        type: 'Feature',
        id: 'invalid',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [0, 0]
        }
      },
      {
        type: 'Feature',
        // no id
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [0, 0]
        }
      }
    ]
  };
  const tileindex = geojsonVt(orig);
  const tile = tileindex.getTile(1, 0, 0);
  const buff = vtpbf.fromGeojsonVt({ geojsonLayer: tile });
  const vt = new VectorTile(new Pbf(buff));
  const layer = vt.layers.geojsonLayer;
  t.assert.deepEqual(layer.feature(0).id, 123);
  t.assert.ok(!layer.feature(1).id, 'Non-integer values should not be saved');
  t.assert.ok(!layer.feature(2).id);
});

test('accept geojson-vt options https://github.com/mapbox/vt-pbf/pull/21', t => {
  const version = 2;
  const extent = 8192;
  const orig = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '/fixtures/rectangle.geojson')));
  const tileindex = geojsonVt(orig, { extent });
  const tile = tileindex.getTile(1, 0, 0);
  const options = { version, extent };
  const buff = vtpbf.fromGeojsonVt({ geojsonLayer: tile }, options);

  const vt = new VectorTile(new Pbf(buff));
  const layer = vt.layers.geojsonLayer;
  const features = [];
  for (let i = 0; i < layer.length; i++) {
    const feat = layer.feature(i).toGeoJSON(0, 0, 1);
    features.push(feat);
  }

  t.assert.equal(layer.version, options.version, 'version should be equal');
  t.assert.equal(layer.extent, options.extent, 'extent should be equal');

  orig.features.forEach(expected => {
    const actual = features.shift();
    t.assert.ok(eq.compare(actual, expected));
  });
});
