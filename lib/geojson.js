import Pbf from '@mapwhit/pbf';
import { command, writeValue, zigzag } from './util.js';

/**
 * Serialized a geojson-vt-created tile to pbf.
 *
 * @param {Object} layers - An object mapping layer names to geojson-vt-created vector tile objects
 * @param {Object} [options] - An object specifying the vector-tile specification version and extent that were used to create `layers`.
 * @param {Number} [options.version=1] - Version of vector-tile spec used
 * @param {Number} [options.extent=4096] - Extent of the vector tile
 * @return {Buffer} uncompressed, pbf-serialized tile data
 */
export function fromGeojsonVt(layers, options = {}) {
  const out = new Pbf();
  for (const [name, layer] of Object.entries(layers)) {
    out.writeMessage(3, writeLayer, { name, options, layer });
  }
  return out.finish();
}

export function writeLayer({ name = '', options, layer }, pbf) {
  pbf.writeVarintField(15, options.version || 1);
  pbf.writeStringField(1, name);
  pbf.writeVarintField(5, options.extent || 4096);

  const context = {
    name,
    feature: undefined,
    keys: [],
    values: [],
    keycache: {},
    valuecache: {}
  };

  for (let i = 0; i < layer.features.length; i++) {
    context.feature = layer.features[i];
    pbf.writeMessage(2, writeFeature, context);
  }

  for (const key of context.keys) {
    pbf.writeStringField(3, key);
  }

  for (const value of context.values) {
    pbf.writeMessage(4, writeValue, value);
  }
}

function writeFeature(context, pbf) {
  const feature = context.feature;

  if (typeof feature.id === 'number') {
    pbf.writeVarintField(1, feature.id);
  }

  pbf.writeMessage(2, writeProperties, context);
  pbf.writeVarintField(3, feature.type);
  pbf.writeMessage(4, writeGeometry, feature);
}

function writeProperties(context, pbf) {
  const { feature, keys, values, keycache, valuecache } = context;

  for (const key in feature.tags) {
    let value = feature.tags[key];
    if (value === null) continue; // don't encode null value properties

    let keyIndex = keycache[key];

    if (typeof keyIndex === 'undefined') {
      keys.push(key);
      keyIndex = keys.length - 1;
      keycache[key] = keyIndex;
    }
    pbf.writeVarint(keyIndex);

    const type = typeof value;
    if (type !== 'string' && type !== 'boolean' && type !== 'number') {
      value = JSON.stringify(value);
    }
    const valueKey = `${type}:${value}`;
    let valueIndex = valuecache[valueKey];
    if (typeof valueIndex === 'undefined') {
      values.push(value);
      valueIndex = values.length - 1;
      valuecache[valueKey] = valueIndex;
    }
    pbf.writeVarint(valueIndex);
  }
}

function writeGeometry(feature, pbf) {
  const geometry = feature.type === 1 ? [feature.geometry] : feature.geometry;
  const type = feature.type;
  let x = 0;
  let y = 0;
  const rings = geometry.length;
  for (let r = 0; r < rings; r++) {
    const ring = geometry[r];
    let count = 1;
    if (type === 1) {
      count = ring.length;
    }
    pbf.writeVarint(command(1, count)); // moveto
    // do not write polygon closing path as lineto
    const lineCount = type === 3 ? ring.length - 1 : ring.length;
    for (let i = 0; i < lineCount; i++) {
      if (i === 1 && type !== 1) {
        pbf.writeVarint(command(2, lineCount - 1)); // lineto
      }
      const dx = ring[i][0] - x;
      const dy = ring[i][1] - y;
      pbf.writeVarint(zigzag(dx));
      pbf.writeVarint(zigzag(dy));
      x += dx;
      y += dy;
    }
    if (type === 3) {
      pbf.writeVarint(command(7, 1)); // closepath
    }
  }
}
