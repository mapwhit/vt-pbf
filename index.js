import { fromGeojsonVt } from './lib/geojson.js';
import GeoJSONWrapper from './lib/geojson_wrapper.js';
import { fromVectorTileJs } from './lib/vector-tile.js';

export default fromVectorTileJs;
export { GeoJSONWrapper, fromVectorTileJs, fromGeojsonVt };
