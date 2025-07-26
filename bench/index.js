import fs from 'node:fs';
import path from 'node:path';
import { VectorTile } from '@mapwhit/vector-tile';
import Benchmark from 'benchmark';
import geojsonVt from 'geojson-vt';
import Pbf from 'pbf';
import { fromGeojsonVt, fromVectorTileJs } from '../index.js';

const raw = fs.readFileSync(path.join(import.meta.dirname, '../test/fixtures/rectangle-1.0.0.pbf'));
const rawTile = new VectorTile(new Pbf(raw));
fromVectorTileJs(rawTile);

const properties = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'properties.geojson')));
const propertiesTile = geojsonVt(properties).getTile(0, 0, 0);

const simple = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'rectangle.geojson')));
const simpleTile = geojsonVt(simple).getTile(0, 0, 0);

const points = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'points.geojson')));
const pointsTile = geojsonVt(points).getTile(14, 3888, 6255);

const suite = new Benchmark.Suite('vt-pbf');
suite
  .add('raw', () => {
    fromVectorTileJs(rawTile);
  })
  .add('simple', () => {
    fromGeojsonVt({ geojsonLayer: simpleTile });
  })
  .add('points', () => {
    fromGeojsonVt({ geojsonLayer: pointsTile });
  })
  .add('lots of properties', () => {
    fromGeojsonVt({ geojsonLayer: propertiesTile });
  })
  .on('cycle', event => {
    console.log(String(event.target));
  })
  .run();
