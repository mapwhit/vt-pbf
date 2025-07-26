export function writeProperties(context, pbf) {
  const { properties, keys, values, keycache, valuecache } = context;

  for (const key in properties) {
    let value = properties[key];
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

function command(cmd, length) {
  return (length << 3) + (cmd & 0x7);
}

function zigzag(num) {
  return (num << 1) ^ (num >> 31);
}

export function writeValue(value, pbf) {
  switch (typeof value) {
    case 'string':
      pbf.writeStringField(1, value);
      break;
    case 'boolean':
      pbf.writeBooleanField(7, value);
      break;
    case 'number':
      if (value % 1 !== 0) {
        pbf.writeDoubleField(3, value);
      } else if (value < 0) {
        pbf.writeSVarintField(6, value);
      } else {
        pbf.writeVarintField(5, value);
      }
      break;
  }
}

export function writeKeysAndValues({ keys, values }, pbf) {
  for (const key of keys) {
    pbf.writeStringField(3, key);
  }

  for (const value of values) {
    pbf.writeMessage(4, writeValue, value);
  }
}

export function makeWriteGeometry(points) {
  const delta = points ? pointDelta : llDelta;
  return writeGeometry;

  function writeGeometry({ geometry, type }, pbf) {
    let x = 0;
    let y = 0;
    for (const ring of geometry) {
      const count = type === 1 ? ring.length : 1;
      pbf.writeVarint(command(1, count)); // moveto
      // do not write polygon closing path as lineto
      const lineCount = type === 3 ? ring.length - 1 : ring.length;
      for (let i = 0; i < lineCount; i++) {
        if (i === 1 && type !== 1) {
          pbf.writeVarint(command(2, lineCount - 1)); // lineto
        }
        const { dx, dy } = delta(ring[i], x, y);
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
}

function pointDelta(point, x, y) {
  return {
    dx: point.x - x,
    dy: point.y - y
  };
}

function llDelta(ll, x, y) {
  return {
    dx: ll[0] - x,
    dy: ll[1] - y
  };
}
