const fs = require('node:fs');
const geojsonVt = require('geojson-vt');
const vtpbf = require('../');

// Example: read geojson from a file and write a protobuf
// Usage: node example.js filename.geojson z x y > tile.z.x.y.pbf

const orig = JSON.parse(fs.readFileSync(process.argv[2]));
const tileindex = geojsonVt(orig);

const z = +process.argv[3];
const x = +process.argv[4];
const y = +process.argv[5];
const tile = tileindex.getTile(z, x, y);

const buff = vtpbf.fromGeojsonVt(tile, 'geojsonLayer');
process.stdout.write(buff);
