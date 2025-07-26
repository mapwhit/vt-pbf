[![NPM version][npm-image]][npm-url]
[![Build Status][build-image]][build-url]
[![Dependency Status][deps-image]][deps-url]

# @maphit/vt-pbf

Fork of [vt-pbf]

Serialize [Mapbox vector tiles](https://github.com/mapbox/vector-tile-spec) to binary protobufs in javascript.

## Usage

As far as I know, the two places you might get a JS representation of a vector
tile are [geojson-vt](https://github.com/mapbox/geojson-vt) and
[vector-tile-js](https://github.com/mapbox/vector-tile-js).  These both use
slightly different internal representations, so serializing each looks slightly
different:

## From vector-tile-js

```javascript
import vtpbf from 'vt-pbf';
import { VectorTile } from '@mapwhit/vector-tile';
import Protobuf from 'pbf';

const data = fs.readFileSync(import.meta.dirname + '/fixtures/rectangle-1.0.0.pbf')
const tile = new VectorTile(new Protobuf(data))
const orig = tile.layers['geojsonLayer'].feature(0).toGeoJSON(0, 0, 1)

const buff = vtpbf(tile)
fs.writeFileSync('my-tile.pbf', buff)
```

## From geojson-vt

```javascript
import * as vtpbf from 'vt-pbf';
import geojsonVt from 'geojson-vt';

const orig = JSON.parse(fs.readFileSync(import.meta.dirname + '/fixtures/rectangle.geojson'))
const tileindex = geojsonVt(orig)
const tile = tileindex.getTile(1, 0, 0)

// pass in an object mapping layername -> tile object
const buff = vtpbf.fromGeojsonVt({ 'geojsonLayer': tile })
fs.writeFileSync('my-tile.pbf', buff)
```

`vtpbf.fromGeojsonVt` takes two arguments:
- `layerMap` is an object where keys are layer names and values are a geojson-vt tile,
- `options` is an object (optional argument). There are 2 supported keys: `version` to define the version of the mvt spec used and `extent` to define the extent of the tile. `version` defaults to 1 and `extent` to 4096.

[vt-pbf]: https://npmjs.org/package/vt-pbf

[npm-image]: https://img.shields.io/npm/v/@mapwhit/vt-pbf
[npm-url]: https://npmjs.org/package/@mapwhit/vt-pbf

[build-url]: https://github.com/mapwhit/vt-pbf/actions/workflows/check.yaml
[build-image]: https://img.shields.io/github/actions/workflow/status/mapwhit/vt-pbf/check.yaml?branch=main

[deps-image]: https://img.shields.io/librariesio/release/npm/@mapwhit/vt-pbf
[deps-url]: https://libraries.io/npm/@mapwhit%2Fvt-pbf
