// PostgreSQL Wire Protocol helpers
// Implements the minimal subset of the v3 protocol needed for simple query execution

export let MessageTypes = {
  // Frontend (client -> server)
  STARTUP: 0,
  PASSWORD: 'p'.charCodeAt(0),
  QUERY: 'Q'.charCodeAt(0),
  TERMINATE: 'X'.charCodeAt(0),
  // Backend (server -> client)
  AUTHENTICATION: 'R'.charCodeAt(0),
  ERROR_RESPONSE: 'E'.charCodeAt(0),
  ROW_DESCRIPTION: 'T'.charCodeAt(0),
  DATA_ROW: 'D'.charCodeAt(0),
  COMMAND_COMPLETE: 'C'.charCodeAt(0),
  READY_FOR_QUERY: 'Z'.charCodeAt(0),
  NOTICE_RESPONSE: 'N'.charCodeAt(0),
  PARAMETER_STATUS: 'S'.charCodeAt(0),
  BACKEND_KEY_DATA: 'K'.charCodeAt(0),
  EMPTY_QUERY_RESPONSE: 'I'.charCodeAt(0)
} as const;

export let AuthenticationTypes = {
  OK: 0,
  CLEARTEXT_PASSWORD: 3,
  MD5_PASSWORD: 5,
  SASL: 10,
  SASL_CONTINUE: 11,
  SASL_FINAL: 12
} as const;

// Simple byte buffer writer
export class MessageWriter {
  private parts: Uint8Array[] = [];
  private length = 0;

  writeInt32(val: number): this {
    let buf = new Uint8Array(4);
    let view = new DataView(buf.buffer);
    view.setInt32(0, val, false);
    this.parts.push(buf);
    this.length += 4;
    return this;
  }

  writeInt16(val: number): this {
    let buf = new Uint8Array(2);
    let view = new DataView(buf.buffer);
    view.setInt16(0, val, false);
    this.parts.push(buf);
    this.length += 2;
    return this;
  }

  writeByte(val: number): this {
    let buf = new Uint8Array([val]);
    this.parts.push(buf);
    this.length += 1;
    return this;
  }

  writeCString(val: string): this {
    let encoder = new TextEncoder();
    let encoded = encoder.encode(val);
    let buf = new Uint8Array(encoded.length + 1);
    buf.set(encoded);
    buf[encoded.length] = 0;
    this.parts.push(buf);
    this.length += buf.length;
    return this;
  }

  writeBytes(val: Uint8Array): this {
    this.parts.push(val);
    this.length += val.length;
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

// Build startup message (no message type byte, just length + protocol version + params)
export let buildStartupMessage = (user: string, database: string): Uint8Array => {
  let params = new MessageWriter();
  params.writeInt32(196608); // Protocol version 3.0
  params.writeCString('user');
  params.writeCString(user);
  params.writeCString('database');
  params.writeCString(database);
  params.writeCString('client_encoding');
  params.writeCString('UTF8');
  params.writeByte(0); // Terminator

  let body = params.toBuffer();
  let msg = new MessageWriter();
  msg.writeInt32(body.length + 4); // length includes itself
  msg.writeBytes(body);
  return msg.toBuffer();
};

// Build a typed message (type byte + length + body)
export let buildMessage = (type: number, body: Uint8Array): Uint8Array => {
  let msg = new MessageWriter();
  msg.writeByte(type);
  msg.writeInt32(body.length + 4); // length includes itself
  msg.writeBytes(body);
  return msg.toBuffer();
};

export let buildPasswordMessage = (password: string): Uint8Array => {
  let writer = new MessageWriter();
  writer.writeCString(password);
  return buildMessage(MessageTypes.PASSWORD, writer.toBuffer());
};

export let buildQueryMessage = (query: string): Uint8Array => {
  let writer = new MessageWriter();
  writer.writeCString(query);
  return buildMessage(MessageTypes.QUERY, writer.toBuffer());
};

export let buildTerminateMessage = (): Uint8Array => {
  return buildMessage(MessageTypes.TERMINATE, new Uint8Array(0));
};

// Parse incoming messages from a buffer
export interface ParsedMessage {
  type: number;
  length: number;
  body: Uint8Array;
}

export let parseMessages = (
  buffer: Uint8Array
): { messages: ParsedMessage[]; remaining: Uint8Array } => {
  let messages: ParsedMessage[] = [];
  let offset = 0;
  let view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  while (offset + 5 <= buffer.length) {
    let type = buffer[offset]!;
    let length = view.getInt32(offset + 1, false);

    if (offset + 1 + length > buffer.length) {
      break; // Incomplete message
    }

    let body = buffer.slice(offset + 5, offset + 1 + length);
    messages.push({ type, length, body });
    offset += 1 + length;
  }

  return {
    messages,
    remaining: buffer.slice(offset)
  };
};

// Parse error/notice response fields
export let parseErrorFields = (body: Uint8Array): Record<string, string> => {
  let fields: Record<string, string> = {};
  let decoder = new TextDecoder();
  let offset = 0;

  while (offset < body.length) {
    let fieldType = body[offset]!;
    offset++;
    if (fieldType === 0) break;

    let end = body.indexOf(0, offset);
    if (end === -1) break;

    let value = decoder.decode(body.slice(offset, end));
    let key = String.fromCharCode(fieldType);

    // Map common field types
    if (key === 'S') fields.severity = value;
    else if (key === 'V') fields.severityNonLocalized = value;
    else if (key === 'C') fields.code = value;
    else if (key === 'M') fields.message = value;
    else if (key === 'D') fields.detail = value;
    else if (key === 'H') fields.hint = value;
    else if (key === 'P') fields.position = value;
    else if (key === 'q') fields.internalPosition = value;
    else if (key === 'W') fields.where = value;
    else if (key === 's') fields.schema = value;
    else if (key === 't') fields.table = value;
    else if (key === 'c') fields.column = value;
    else if (key === 'd') fields.dataType = value;
    else if (key === 'n') fields.constraint = value;
    else fields[key] = value;

    offset = end + 1;
  }

  return fields;
};

// Parse RowDescription message
export interface ColumnDescription {
  name: string;
  tableOid: number;
  columnIndex: number;
  typeOid: number;
  typeLength: number;
  typeModifier: number;
  formatCode: number;
}

export let parseRowDescription = (body: Uint8Array): ColumnDescription[] => {
  let view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  let decoder = new TextDecoder();
  let fieldCount = view.getInt16(0, false);
  let columns: ColumnDescription[] = [];
  let offset = 2;

  for (let i = 0; i < fieldCount; i++) {
    let nameEnd = body.indexOf(0, offset);
    let name = decoder.decode(body.slice(offset, nameEnd));
    offset = nameEnd + 1;

    let tableOid = view.getInt32(offset, false);
    offset += 4;
    let columnIndex = view.getInt16(offset, false);
    offset += 2;
    let typeOid = view.getInt32(offset, false);
    offset += 4;
    let typeLength = view.getInt16(offset, false);
    offset += 2;
    let typeModifier = view.getInt32(offset, false);
    offset += 4;
    let formatCode = view.getInt16(offset, false);
    offset += 2;

    columns.push({
      name,
      tableOid,
      columnIndex,
      typeOid,
      typeLength,
      typeModifier,
      formatCode
    });
  }

  return columns;
};

// Parse DataRow message
export let parseDataRow = (body: Uint8Array): (string | null)[] => {
  let view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  let decoder = new TextDecoder();
  let fieldCount = view.getInt16(0, false);
  let values: (string | null)[] = [];
  let offset = 2;

  for (let i = 0; i < fieldCount; i++) {
    let length = view.getInt32(offset, false);
    offset += 4;

    if (length === -1) {
      values.push(null);
    } else {
      let value = decoder.decode(body.slice(offset, offset + length));
      values.push(value);
      offset += length;
    }
  }

  return values;
};

// Parse CommandComplete message to extract affected row count
export let parseCommandComplete = (
  body: Uint8Array
): { command: string; rowCount: number | null } => {
  let decoder = new TextDecoder();
  let tag = decoder.decode(body.slice(0, body.indexOf(0)));
  let parts = tag.split(' ');
  let command = parts[0] || tag;
  let lastPart = parts[parts.length - 1];
  let rowCount = lastPart && /^\d+$/.test(lastPart) ? Number.parseInt(lastPart, 10) : null;
  return { command, rowCount };
};

// Map PostgreSQL OIDs to human-readable type names
export let oidToTypeName = (oid: number): string => {
  let typeMap: Record<number, string> = {
    16: 'boolean',
    17: 'bytea',
    18: 'char',
    19: 'name',
    20: 'bigint',
    21: 'smallint',
    23: 'integer',
    25: 'text',
    26: 'oid',
    114: 'json',
    142: 'xml',
    600: 'point',
    700: 'real',
    701: 'double precision',
    790: 'money',
    869: 'inet',
    1042: 'character',
    1043: 'varchar',
    1082: 'date',
    1083: 'time',
    1114: 'timestamp',
    1184: 'timestamptz',
    1186: 'interval',
    1266: 'timetz',
    1700: 'numeric',
    2950: 'uuid',
    3802: 'jsonb',
    3904: 'int4range',
    3906: 'numrange',
    3908: 'tsrange',
    3910: 'tstzrange',
    3912: 'daterange',
    3926: 'int8range'
  };
  return typeMap[oid] || `oid:${oid}`;
};
