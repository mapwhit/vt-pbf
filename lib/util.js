export function command(cmd, length) {
  return (length << 3) + (cmd & 0x7);
}

export function zigzag(num) {
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
