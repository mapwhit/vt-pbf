import Pbf from '@mapwhit/pbf';
import { makeWriteGeometry, writeKeysAndValues, writeProperties } from './util.js';

const writeGeometry = makeWriteGeometry(true);

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
    feature: undefined,
    properties: undefined,
    keys: [],
    values: [],
    keycache: new Map(),
    valuecache: new Map()
  };

  for (let i = 0; i < layer.length; i++) {
    context.feature = layer.feature(i);
    context.properties = context.feature.properties;
    pbf.writeMessage(2, writeFeature, context);
  }

  writeKeysAndValues(context, pbf);
}

function writeFeature(context, pbf) {
  const feature = context.feature;

  if (feature.id !== undefined) {
    pbf.writeVarintField(1, feature.id);
  }

  pbf.writeMessage(2, writeProperties, context);
  pbf.writeVarintField(3, feature.type);
  pbf.writeMessage(4, writeGeometry, {
    geometry: feature.loadGeometry(),
    type: feature.type
  });
}
