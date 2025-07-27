import Pbf from '@mapwhit/pbf';
import { makeWriteGeometry, writeKeysAndValues, writeProperties } from './util.js';

const writeGeometry = makeWriteGeometry(false);

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
    feature: undefined,
    properties: undefined,
    keys: [],
    values: [],
    keycache: new Map(),
    valuecache: new Map()
  };

  for (let i = 0; i < layer.features.length; i++) {
    context.feature = layer.features[i];
    context.properties = context.feature.tags;
    pbf.writeMessage(2, writeFeature, context);
  }

  writeKeysAndValues(context, pbf);
}

function writeFeature(context, pbf) {
  const { feature } = context;

  if (typeof feature.id === 'number') {
    pbf.writeVarintField(1, feature.id);
  }

  pbf.writeMessage(2, writeProperties, context);
  pbf.writeVarintField(3, feature.type);
  pbf.writeMessage(4, writeGeometry, {
    type: feature.type,
    geometry: feature.type === 1 ? [feature.geometry] : feature.geometry
  });
}
