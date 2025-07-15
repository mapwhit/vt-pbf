const fs = require('fs')
const path = require('path')
const geojsonVt = require('geojson-vt')
const Pbf = require('pbf')
const VectorTile = require('@mapwhit/vector-tile').VectorTile
const Benchmark = require('benchmark')
const serialize = require('../')

const raw = fs.readFileSync(path.join(__dirname, '../test/fixtures/rectangle-1.0.0.pbf'))
const rawTile = new VectorTile(new Pbf(raw))
serialize(rawTile)

const properties = JSON.parse(fs.readFileSync(path.join(__dirname, 'properties.geojson')))
const propertiesTile = geojsonVt(properties).getTile(0, 0, 0)

const simple = JSON.parse(fs.readFileSync(path.join(__dirname, 'rectangle.geojson')))
const simpleTile = geojsonVt(simple).getTile(0, 0, 0)

const points = JSON.parse(fs.readFileSync(path.join(__dirname, 'points.geojson')))
const pointsTile = geojsonVt(points).getTile(14, 3888, 6255)

const suite = new Benchmark.Suite('vt-pbf')
suite
  .add('raw', function () {
    serialize(rawTile)
  })
  .add('simple', function () {
    serialize.fromGeojsonVt({ geojsonLayer: simpleTile })
  })
  .add('points', function () {
    serialize.fromGeojsonVt({ geojsonLayer: pointsTile })
  })
  .add('lots of properties', function () {
    serialize.fromGeojsonVt({ geojsonLayer: propertiesTile })
  })
  .on('cycle', function (event) {
    console.log(String(event.target))
  })
  .run()
