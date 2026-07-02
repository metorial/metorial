// MySQL Wire Protocol helpers
// Implements the subset of the MySQL client/server protocol needed for query execution
// Reference: https://dev.mysql.com/doc/dev/mysql-server/latest/page_protocol_basic_packets.html

// --- Packet Types ---

export let COM_QUIT = 0x01;
export let COM_QUERY = 0x03;
export let COM_PING = 0x0e;

// --- Response Packet Markers ---
export let OK_PACKET = 0x00;
export let EOF_PACKET = 0xfe;
export let ERR_PACKET = 0xff;
export let LOCAL_INFILE_PACKET = 0xfb;

// --- Capability Flags ---
export let CLIENT_LONG_PASSWORD = 1;
export let CLIENT_FOUND_ROWS = 2;
export let CLIENT_LONG_FLAG = 4;
export let CLIENT_CONNECT_WITH_DB = 8;
export let CLIENT_PROTOCOL_41 = 0x200;
export let CLIENT_SECURE_CONNECTION = 0x8000;
export let CLIENT_PLUGIN_AUTH = 0x00080000;
export let CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA = 0x00200000;
export let CLIENT_DEPRECATE_EOF = 0x01000000;
export let CLIENT_SSL = 0x00000800;

// --- Character Sets ---
export let UTF8_GENERAL_CI = 0x21; // utf8_general_ci (utf8mb3)
export let UTF8MB4_GENERAL_CI = 0x2d; // utf8mb4_general_ci

// --- Byte Utilities ---

export class ByteWriter {
  private parts: Uint8Array[] = [];
  private length = 0;

  writeUint8(val: number): this {
    this.parts.push(new Uint8Array([val & 0xff]));
    this.length += 1;
    return this;
  }

  writeUint16LE(val: number): this {
    let buf = new Uint8Array(2);
    buf[0] = val & 0xff;
    buf[1] = (val >> 8) & 0xff;
    this.parts.push(buf);
    this.length += 2;
    return this;
  }

  writeUint24LE(val: number): this {
    let buf = new Uint8Array(3);
    buf[0] = val & 0xff;
    buf[1] = (val >> 8) & 0xff;
    buf[2] = (val >> 16) & 0xff;
    this.parts.push(buf);
    this.length += 3;
    return this;
  }

  writeUint32LE(val: number): this {
    let buf = new Uint8Array(4);
    buf[0] = val & 0xff;
    buf[1] = (val >> 8) & 0xff;
    buf[2] = (val >> 16) & 0xff;
    buf[3] = (val >> 24) & 0xff;
    this.parts.push(buf);
    this.length += 4;
    return this;
  }

  writeNullTerminatedString(val: string): this {
    let encoder = new TextEncoder();
    let encoded = encoder.encode(val);
    let buf = new Uint8Array(encoded.length + 1);
    buf.set(encoded);
    buf[encoded.length] = 0;
    this.parts.push(buf);
    this.length += buf.length;
    return this;
  }

  writeString(val: string): this {
    let encoder = new TextEncoder();
    let encoded = encoder.encode(val);
    this.parts.push(encoded);
    this.length += encoded.length;
    return this;
  }

  writeBytes(val: Uint8Array): this {
    this.parts.push(val);
    this.length += val.length;
    return this;
  }

  writeFill(val: number, count: number): this {
    let buf = new Uint8Array(count);
    buf.fill(val);
    this.parts.push(buf);
    this.length += count;
    return this;
  }

  writeLenencInt(val: number): this {
    if (val < 251) {
      this.writeUint8(val);
    } else if (val < 65536) {
      this.writeUint8(0xfc);
      this.writeUint16LE(val);
    } else if (val < 16777216) {
      this.writeUint8(0xfd);
      this.writeUint24LE(val);
    } else {
      this.writeUint8(0xfe);
      // Write as two 32-bit values for simplicity (supports up to 2^53)
      this.writeUint32LE(val & 0xffffffff);
      this.writeUint32LE(Math.floor(val / 0x100000000));
    }
    return this;
  }

  writeLenencString(val: string): this {
    let encoder = new TextEncoder();
    let encoded = encoder.encode(val);
    this.writeLenencInt(encoded.length);
    this.writeBytes(encoded);
    return this;
  }

  toBuffer(): Uint8Array {
    let result = new Uint8Array(this.length);
    let offset = 0;
    for (let part of this.parts) {
      result.set(part, offset);
      offset += part.length;
    }
    return result;
  }

  getLength(): number {
    return this.length;
  }
}

// --- Reading Utilities ---

export let readUint8 = (buf: Uint8Array, offset: number): number => {
  return buf[offset]!;
};

export let readUint16LE = (buf: Uint8Array, offset: number): number => {
  return buf[offset]! | (buf[offset + 1]! << 8);
};

export let readUint24LE = (buf: Uint8Array, offset: number): number => {
  return buf[offset]! | (buf[offset + 1]! << 8) | (buf[offset + 2]! << 16);
};

export let readUint32LE = (buf: Uint8Array, offset: number): number => {
  return (
    (buf[offset]! |
      (buf[offset + 1]! << 8) |
      (buf[offset + 2]! << 16) |
      (buf[offset + 3]! << 24)) >>>
    0
  );
};

export let readNullTerminatedString = (
  buf: Uint8Array,
  offset: number
): { value: string; nextOffset: number } => {
  let decoder = new TextDecoder();
  let end = buf.indexOf(0, offset);
  if (end === -1) end = buf.length;
  let value = decoder.decode(buf.slice(offset, end));
  return { value, nextOffset: end + 1 };
};

export let readLenencInt = (
  buf: Uint8Array,
  offset: number
): { value: number; nextOffset: number } => {
  let first = buf[offset]!;
  if (first < 251) {
    return { value: first, nextOffset: offset + 1 };
  } else if (first === 0xfc) {
    return { value: readUint16LE(buf, offset + 1), nextOffset: offset + 3 };
  } else if (first === 0xfd) {
    return { value: readUint24LE(buf, offset + 1), nextOffset: offset + 4 };
  } else if (first === 0xfe) {
    let low = readUint32LE(buf, offset + 1);
    let high = readUint32LE(buf, offset + 5);
    return { value: high * 0x100000000 + low, nextOffset: offset + 9 };
  }
  return { value: 0, nextOffset: offset + 1 };
};

export let readLenencString = (
  buf: Uint8Array,
  offset: number
): { value: string; nextOffset: number } => {
  let { value: len, nextOffset } = readLenencInt(buf, offset);
  let decoder = new TextDecoder();
  let str = decoder.decode(buf.slice(nextOffset, nextOffset + len));
  return { value: str, nextOffset: nextOffset + len };
};

export let readRestOfPacketString = (buf: Uint8Array, offset: number): string => {
  let decoder = new TextDecoder();
  return decoder.decode(buf.slice(offset));
};

// --- Packet Framing ---

export interface MySQLPacket {
  sequenceId: number;
  payload: Uint8Array;
}

// Parse MySQL packets from a raw buffer stream
export let parsePackets = (
  buffer: Uint8Array
): { packets: MySQLPacket[]; remaining: Uint8Array } => {
  let packets: MySQLPacket[] = [];
  let offset = 0;

  while (offset + 4 <= buffer.length) {
    let payloadLength = readUint24LE(buffer, offset);
    let sequenceId = buffer[offset + 3]!;

    if (offset + 4 + payloadLength > buffer.length) {
      break; // Incomplete packet
    }

    let payload = buffer.slice(offset + 4, offset + 4 + payloadLength);
    packets.push({ sequenceId, payload });
    offset += 4 + payloadLength;
  }

  return {
    packets,
    remaining: buffer.slice(offset)
  };
};

// Build a MySQL packet (4-byte header + payload)
export let buildPacket = (sequenceId: number, payload: Uint8Array): Uint8Array => {
  let packet = new Uint8Array(4 + payload.length);
  // Payload length (3 bytes LE)
  packet[0] = payload.length & 0xff;
  packet[1] = (payload.length >> 8) & 0xff;
  packet[2] = (payload.length >> 16) & 0xff;
  // Sequence ID
  packet[3] = sequenceId & 0xff;
  // Payload
  packet.set(payload, 4);
  return packet;
};

// --- Handshake Parsing ---

export interface HandshakeV10 {
  protocolVersion: number;
  serverVersion: string;
  connectionId: number;
  authPluginDataPart1: Uint8Array;
  capabilityFlags: number;
  characterSet: number;
  statusFlags: number;
  authPluginDataPart2: Uint8Array;
  authPluginName: string;
}

export let parseHandshakeV10 = (payload: Uint8Array): HandshakeV10 => {
  let offset = 0;

  let protocolVersion = readUint8(payload, offset);
  offset += 1;

  let { value: serverVersion, nextOffset } = readNullTerminatedString(payload, offset);
  offset = nextOffset;

  let connectionId = readUint32LE(payload, offset);
  offset += 4;

  // auth-plugin-data-part-1 (8 bytes)
  let authPluginDataPart1 = payload.slice(offset, offset + 8);
  offset += 8;

  // filler byte
  offset += 1;

  // capability flags (lower 2 bytes)
  let capabilityFlagsLower = readUint16LE(payload, offset);
  offset += 2;

  let characterSet = readUint8(payload, offset);
  offset += 1;

  let statusFlags = readUint16LE(payload, offset);
  offset += 2;

  // capability flags (upper 2 bytes)
  let capabilityFlagsUpper = readUint16LE(payload, offset);
  offset += 2;

  let capabilityFlags = capabilityFlagsLower | (capabilityFlagsUpper << 16);

  // auth-plugin-data-len or 0x00
  let authPluginDataLen = readUint8(payload, offset);
  offset += 1;

  // reserved (10 bytes)
  offset += 10;

  // auth-plugin-data-part-2
  let authPluginDataPart2 = new Uint8Array(0);
  if (capabilityFlags & CLIENT_SECURE_CONNECTION) {
    let part2Len = Math.max(13, authPluginDataLen - 8);
    authPluginDataPart2 = payload.slice(offset, offset + part2Len);
    offset += part2Len;
    // Remove trailing null byte if present
    if (authPluginDataPart2[authPluginDataPart2.length - 1] === 0) {
      authPluginDataPart2 = authPluginDataPart2.slice(0, authPluginDataPart2.length - 1);
    }
  }

  // auth-plugin name
  let authPluginName = '';
  if (capabilityFlags & CLIENT_PLUGIN_AUTH) {
    let { value } = readNullTerminatedString(payload, offset);
    authPluginName = value;
  }

  return {
    protocolVersion,
    serverVersion,
    connectionId,
    authPluginDataPart1,
    capabilityFlags,
    characterSet,
    statusFlags,
    authPluginDataPart2,
    authPluginName
  };
};

// --- Handshake Response ---

export let buildHandshakeResponse41 = (params: {
  capabilityFlags: number;
  maxPacketSize: number;
  characterSet: number;
  username: string;
  authResponse: Uint8Array;
  database: string;
  authPluginName: string;
}): Uint8Array => {
  let writer = new ByteWriter();
  writer.writeUint32LE(params.capabilityFlags);
  writer.writeUint32LE(params.maxPacketSize);
  writer.writeUint8(params.characterSet);
  writer.writeFill(0, 23); // reserved bytes
  writer.writeNullTerminatedString(params.username);

  if (params.capabilityFlags & CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA) {
    writer.writeLenencInt(params.authResponse.length);
    writer.writeBytes(params.authResponse);
  } else if (params.capabilityFlags & CLIENT_SECURE_CONNECTION) {
    writer.writeUint8(params.authResponse.length);
    writer.writeBytes(params.authResponse);
  } else {
    writer.writeBytes(params.authResponse);
    writer.writeUint8(0);
  }

  if (params.capabilityFlags & CLIENT_CONNECT_WITH_DB) {
    writer.writeNullTerminatedString(params.database);
  }

  if (params.capabilityFlags & CLIENT_PLUGIN_AUTH) {
    writer.writeNullTerminatedString(params.authPluginName);
  }

  return writer.toBuffer();
};

// --- SSL Request ---

export let buildSSLRequest = (
  capabilityFlags: number,
  maxPacketSize: number,
  characterSet: number
): Uint8Array => {
  let writer = new ByteWriter();
  writer.writeUint32LE(capabilityFlags);
  writer.writeUint32LE(maxPacketSize);
  writer.writeUint8(characterSet);
  writer.writeFill(0, 23);
  return writer.toBuffer();
};

// --- Command Packets ---

export let buildComQuery = (sql: string): Uint8Array => {
  let encoder = new TextEncoder();
  let sqlBytes = encoder.encode(sql);
  let buf = new Uint8Array(1 + sqlBytes.length);
  buf[0] = COM_QUERY;
  buf.set(sqlBytes, 1);
  return buf;
};

export let buildComQuit = (): Uint8Array => {
  return new Uint8Array([COM_QUIT]);
};

export let buildComPing = (): Uint8Array => {
  return new Uint8Array([COM_PING]);
};

// --- Response Parsing ---

export interface OkPacketData {
  affectedRows: number;
  lastInsertId: number;
  statusFlags: number;
  warningCount: number;
  info: string;
}

export let parseOkPacket = (payload: Uint8Array): OkPacketData => {
  let offset = 1; // skip 0x00 marker
  let { value: affectedRows, nextOffset: off1 } = readLenencInt(payload, offset);
  let { value: lastInsertId, nextOffset: off2 } = readLenencInt(payload, off1);
  let statusFlags = readUint16LE(payload, off2);
  let warningCount = readUint16LE(payload, off2 + 2);
  let info = '';
  if (off2 + 4 < payload.length) {
    let decoder = new TextDecoder();
    info = decoder.decode(payload.slice(off2 + 4));
  }
  return { affectedRows, lastInsertId, statusFlags, warningCount, info };
};

export interface ErrPacketData {
  errorCode: number;
  sqlStateMarker: string;
  sqlState: string;
  errorMessage: string;
}

export let parseErrPacket = (payload: Uint8Array): ErrPacketData => {
  let decoder = new TextDecoder();
  let offset = 1; // skip 0xff marker
  let errorCode = readUint16LE(payload, offset);
  offset += 2;
  let sqlStateMarker = '';
  let sqlState = '';
  // Check for SQL state marker '#'
  if (payload[offset] === 0x23) {
    // '#'
    sqlStateMarker = '#';
    offset += 1;
    sqlState = decoder.decode(payload.slice(offset, offset + 5));
    offset += 5;
  }
  let errorMessage = decoder.decode(payload.slice(offset));
  return { errorCode, sqlStateMarker, sqlState, errorMessage };
};

// --- Column Definition ---

export interface ColumnDefinition {
  catalog: string;
  schema: string;
  table: string;
  orgTable: string;
  name: string;
  orgName: string;
  characterSet: number;
  columnLength: number;
  columnType: number;
  flags: number;
  decimals: number;
}

export let parseColumnDefinition41 = (payload: Uint8Array): ColumnDefinition => {
  let offset = 0;

  let { value: catalog, nextOffset: off1 } = readLenencString(payload, offset);
  let { value: schema, nextOffset: off2 } = readLenencString(payload, off1);
  let { value: table, nextOffset: off3 } = readLenencString(payload, off2);
  let { value: orgTable, nextOffset: off4 } = readLenencString(payload, off3);
  let { value: name, nextOffset: off5 } = readLenencString(payload, off4);
  let { value: orgName, nextOffset: off6 } = readLenencString(payload, off5);

  // Skip length of fixed-length fields marker (always 0x0c)
  off6 += 1;

  let characterSet = readUint16LE(payload, off6);
  off6 += 2;
  let columnLength = readUint32LE(payload, off6);
  off6 += 4;
  let columnType = readUint8(payload, off6);
  off6 += 1;
  let flags = readUint16LE(payload, off6);
  off6 += 2;
  let decimals = readUint8(payload, off6);

  return {
    catalog,
    schema,
    table,
    orgTable,
    name,
    orgName,
    characterSet,
    columnLength,
    columnType,
    flags,
    decimals
  };
};

// --- Row Data Parsing ---

export let parseTextResultRow = (
  payload: Uint8Array,
  columnCount: number
): (string | null)[] => {
  let values: (string | null)[] = [];
  let offset = 0;

  for (let i = 0; i < columnCount; i++) {
    if (payload[offset] === 0xfb) {
      // NULL
      values.push(null);
      offset += 1;
    } else {
      let { value, nextOffset } = readLenencString(payload, offset);
      values.push(value);
      offset = nextOffset;
    }
  }

  return values;
};

// --- MySQL Field Type Constants ---

export let MYSQL_TYPE_DECIMAL = 0x00;
export let MYSQL_TYPE_TINY = 0x01;
export let MYSQL_TYPE_SHORT = 0x02;
export let MYSQL_TYPE_LONG = 0x03;
export let MYSQL_TYPE_FLOAT = 0x04;
export let MYSQL_TYPE_DOUBLE = 0x05;
export let MYSQL_TYPE_NULL = 0x06;
export let MYSQL_TYPE_TIMESTAMP = 0x07;
export let MYSQL_TYPE_LONGLONG = 0x08;
export let MYSQL_TYPE_INT24 = 0x09;
export let MYSQL_TYPE_DATE = 0x0a;
export let MYSQL_TYPE_TIME = 0x0b;
export let MYSQL_TYPE_DATETIME = 0x0c;
export let MYSQL_TYPE_YEAR = 0x0d;
export let MYSQL_TYPE_NEWDATE = 0x0e;
export let MYSQL_TYPE_VARCHAR = 0x0f;
export let MYSQL_TYPE_BIT = 0x10;
export let MYSQL_TYPE_JSON = 0xf5;
export let MYSQL_TYPE_NEWDECIMAL = 0xf6;
export let MYSQL_TYPE_ENUM = 0xf7;
export let MYSQL_TYPE_SET = 0xf8;
export let MYSQL_TYPE_TINY_BLOB = 0xf9;
export let MYSQL_TYPE_MEDIUM_BLOB = 0xfa;
export let MYSQL_TYPE_LONG_BLOB = 0xfb;
export let MYSQL_TYPE_BLOB = 0xfc;
export let MYSQL_TYPE_VAR_STRING = 0xfd;
export let MYSQL_TYPE_STRING = 0xfe;
export let MYSQL_TYPE_GEOMETRY = 0xff;

// Map MySQL field type to human-readable name
export let mysqlTypeToName = (typeId: number): string => {
  let typeMap: Record<number, string> = {
    [MYSQL_TYPE_DECIMAL]: 'decimal',
    [MYSQL_TYPE_TINY]: 'tinyint',
    [MYSQL_TYPE_SHORT]: 'smallint',
    [MYSQL_TYPE_LONG]: 'int',
    [MYSQL_TYPE_FLOAT]: 'float',
    [MYSQL_TYPE_DOUBLE]: 'double',
    [MYSQL_TYPE_NULL]: 'null',
    [MYSQL_TYPE_TIMESTAMP]: 'timestamp',
    [MYSQL_TYPE_LONGLONG]: 'bigint',
    [MYSQL_TYPE_INT24]: 'mediumint',
    [MYSQL_TYPE_DATE]: 'date',
    [MYSQL_TYPE_TIME]: 'time',
    [MYSQL_TYPE_DATETIME]: 'datetime',
    [MYSQL_TYPE_YEAR]: 'year',
    [MYSQL_TYPE_NEWDATE]: 'date',
    [MYSQL_TYPE_VARCHAR]: 'varchar',
    [MYSQL_TYPE_BIT]: 'bit',
    [MYSQL_TYPE_JSON]: 'json',
    [MYSQL_TYPE_NEWDECIMAL]: 'decimal',
    [MYSQL_TYPE_ENUM]: 'enum',
    [MYSQL_TYPE_SET]: 'set',
    [MYSQL_TYPE_TINY_BLOB]: 'tinyblob',
    [MYSQL_TYPE_MEDIUM_BLOB]: 'mediumblob',
    [MYSQL_TYPE_LONG_BLOB]: 'longblob',
    [MYSQL_TYPE_BLOB]: 'blob',
    [MYSQL_TYPE_VAR_STRING]: 'varchar',
    [MYSQL_TYPE_STRING]: 'char',
    [MYSQL_TYPE_GEOMETRY]: 'geometry'
  };
  return typeMap[typeId] || `type:${typeId}`;
};

// --- Auth Plugin Data ---

// Combine auth plugin data parts from handshake
export let getFullAuthPluginData = (handshake: HandshakeV10): Uint8Array => {
  let part1 = handshake.authPluginDataPart1;
  let part2 = handshake.authPluginDataPart2;
  let combined = new Uint8Array(part1.length + part2.length);
  combined.set(part1);
  combined.set(part2, part1.length);
  return combined;
};

// Check if payload is an EOF packet (0xfe with payload length < 9)
export let isEofPacket = (payload: Uint8Array): boolean => {
  return payload[0] === EOF_PACKET && payload.length < 9;
};

// Check if payload is an OK packet (0x00 marker)
export let isOkPacket = (payload: Uint8Array): boolean => {
  return payload[0] === OK_PACKET;
};

// Check if payload is an ERR packet (0xff marker)
export let isErrPacket = (payload: Uint8Array): boolean => {
  return payload[0] === ERR_PACKET;
};
