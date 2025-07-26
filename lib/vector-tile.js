import Pbf from '@mapwhit/pbf';
import { command, writeValue, zigzag } from './util.js';

/**
 * Serialize a vector-tile-js-created tile to pbf
 *
 * @param {Object} tile
 * @return {Buffer} uncompressed, pbf-serialized tile data
 */
export function fromVectorTileJs(tile) {
  const out = new Pbf();
  for (const layer of Object.values(tile.layers)) {
    out.writeMessage(3, writeLayer, layer);
  }
  return out.finish();
}

function writeLayer(layer, pbf) {
  pbf.writeVarintField(15, layer.version || 1);
  pbf.writeStringField(1, layer.name || '');
  pbf.writeVarintField(5, layer.extent || 4096);

  const context = {
    keys: [],
    values: [],
    keycache: {},
    valuecache: {}
  };

  for (let i = 0; i < layer.length; i++) {
    context.feature = layer.feature(i);
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

  if (feature.id !== undefined) {
    pbf.writeVarintField(1, feature.id);
  }

  pbf.writeMessage(2, writeProperties, context);
  pbf.writeVarintField(3, feature.type);
  pbf.writeMessage(4, writeGeometry, feature);
}

function writeProperties(context, pbf) {
  const { feature, keys, values, keycache, valuecache } = context;

  for (const key in feature.properties) {
    let value = feature.properties[key];
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
  const geometry = feature.loadGeometry();
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
      const dx = ring[i].x - x;
      const dy = ring[i].y - y;
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
