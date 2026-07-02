// Minimal Apache Thrift Binary Protocol implementation for Evernote API
// Evernote uses Thrift binary protocol over HTTP POST

// Thrift type IDs
let TType = {
  STOP: 0,
  VOID: 1,
  BOOL: 2,
  BYTE: 3,
  I16: 6,
  I32: 8,
  I64: 10,
  DOUBLE: 4,
  STRING: 11,
  STRUCT: 12,
  MAP: 13,
  SET: 14,
  LIST: 15
} as const;

type TTypeValue = (typeof TType)[keyof typeof TType];

// Message types
let TMessageType = {
  CALL: 1,
  REPLY: 2,
  EXCEPTION: 3
} as const;

// Helper to convert string to byte array (UTF-8)
let stringToBytes = (str: string): number[] => {
  let bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6));
      bytes.push(0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff) {
      let hi = code;
      let lo = str.charCodeAt(++i);
      let codePoint = ((hi - 0xd800) << 10) + (lo - 0xdc00) + 0x10000;
      bytes.push(0xf0 | (codePoint >> 18));
      bytes.push(0x80 | ((codePoint >> 12) & 0x3f));
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
      bytes.push(0x80 | (codePoint & 0x3f));
    } else {
      bytes.push(0xe0 | (code >> 12));
      bytes.push(0x80 | ((code >> 6) & 0x3f));
      bytes.push(0x80 | (code & 0x3f));
    }
  }
  return bytes;
};

// Helper to convert byte array to string (UTF-8)
let bytesToString = (bytes: Uint8Array, offset: number, length: number): string => {
  let result = '';
  let end = offset + length;
  let i = offset;
  while (i < end) {
    let byte1 = bytes[i++]!;
    if (byte1 < 0x80) {
      result += String.fromCharCode(byte1);
    } else if (byte1 < 0xe0) {
      let byte2 = bytes[i++]! & 0x3f;
      result += String.fromCharCode(((byte1 & 0x1f) << 6) | byte2);
    } else if (byte1 < 0xf0) {
      let byte2 = bytes[i++]! & 0x3f;
      let byte3 = bytes[i++]! & 0x3f;
      result += String.fromCharCode(((byte1 & 0x0f) << 12) | (byte2 << 6) | byte3);
    } else {
      let byte2 = bytes[i++]! & 0x3f;
      let byte3 = bytes[i++]! & 0x3f;
      let byte4 = bytes[i++]! & 0x3f;
      let codePoint = ((byte1 & 0x07) << 18) | (byte2 << 12) | (byte3 << 6) | byte4;
      codePoint -= 0x10000;
      result += String.fromCharCode(0xd800 + (codePoint >> 10), 0xdc00 + (codePoint & 0x3ff));
    }
  }
  return result;
};

// Thrift Binary Protocol Writer
export class ThriftWriter {
  private buf: number[] = [];

  writeMessageBegin(name: string, type: number, seqId: number) {
    // Strict encoding: version | type in first 4 bytes
    let version = 0x80010000 | type;
    this.writeI32(version);
    this.writeString(name);
    this.writeI32(seqId);
  }

  writeStructBegin() {
    // No-op in binary protocol
  }

  writeStructEnd() {
    // No-op in binary protocol
  }

  writeFieldBegin(type: TTypeValue, id: number) {
    this.writeByte(type);
    this.writeI16(id);
  }

  writeFieldStop() {
    this.writeByte(TType.STOP);
  }

  writeByte(value: number) {
    this.buf.push(value & 0xff);
  }

  writeBool(value: boolean) {
    this.writeByte(value ? 1 : 0);
  }

  writeI16(value: number) {
    this.buf.push((value >> 8) & 0xff);
    this.buf.push(value & 0xff);
  }

  writeI32(value: number) {
    this.buf.push((value >> 24) & 0xff);
    this.buf.push((value >> 16) & 0xff);
    this.buf.push((value >> 8) & 0xff);
    this.buf.push(value & 0xff);
  }

  writeI64(value: number | string) {
    // Handle i64 as two 32-bit parts for precision
    let num = typeof value === 'string' ? Number.parseInt(value, 10) : value;
    // For timestamps and other large numbers
    let high = Math.floor(num / 0x100000000);
    let low = num >>> 0;
    if (num < 0) {
      // Two's complement for negatives
      low = num >>> 0;
      high = Math.floor(num / 0x100000000);
    }
    this.writeI32(high);
    this.writeI32(low);
  }

  writeString(value: string) {
    let bytes = stringToBytes(value);
    this.writeI32(bytes.length);
    for (let b of bytes) {
      this.buf.push(b);
    }
  }

  writeBinary(value: Uint8Array) {
    this.writeI32(value.length);
    for (let i = 0; i < value.length; i++) {
      this.buf.push(value[i]!);
    }
  }

  writeListBegin(elemType: TTypeValue, size: number) {
    this.writeByte(elemType);
    this.writeI32(size);
  }

  writeSetBegin(elemType: TTypeValue, size: number) {
    this.writeByte(elemType);
    this.writeI32(size);
  }

  writeMapBegin(keyType: TTypeValue, valueType: TTypeValue, size: number) {
    this.writeByte(keyType);
    this.writeByte(valueType);
    this.writeI32(size);
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.buf);
  }
}

// Thrift Binary Protocol Reader
export class ThriftReader {
  private pos: number = 0;
  private view: DataView;
  private data: Uint8Array;

  constructor(data: Uint8Array) {
    this.data = data;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  readMessageBegin(): { name: string; type: number; seqId: number } {
    let versionAndType = this.readI32();
    let version = versionAndType & 0xffff0000;
    if (version !== (0x80010000 | 0)) {
      // Check strict mode version
      if ((versionAndType & 0xffff0000) !== 0x80010000) {
        throw new Error(`Bad Thrift version: ${version.toString(16)}`);
      }
    }
    let type = versionAndType & 0x000000ff;
    let name = this.readString();
    let seqId = this.readI32();
    return { name, type, seqId };
  }

  readFieldBegin(): { type: TTypeValue; id: number } {
    let type = this.readByte() as TTypeValue;
    if (type === TType.STOP) {
      return { type: TType.STOP, id: 0 };
    }
    let id = this.readI16();
    return { type, id };
  }

  readByte(): number {
    let val = this.data[this.pos]!;
    this.pos += 1;
    return val;
  }

  readBool(): boolean {
    return this.readByte() !== 0;
  }

  readI16(): number {
    let val = this.view.getInt16(this.pos);
    this.pos += 2;
    return val;
  }

  readI32(): number {
    let val = this.view.getInt32(this.pos);
    this.pos += 4;
    return val;
  }

  readI64(): number {
    let high = this.view.getInt32(this.pos);
    let low = this.view.getUint32(this.pos + 4);
    this.pos += 8;
    return high * 0x100000000 + low;
  }

  readDouble(): number {
    let val = this.view.getFloat64(this.pos);
    this.pos += 8;
    return val;
  }

  readString(): string {
    let length = this.readI32();
    let result = bytesToString(this.data, this.pos, length);
    this.pos += length;
    return result;
  }

  readBinary(): Uint8Array {
    let length = this.readI32();
    let result = this.data.slice(this.pos, this.pos + length);
    this.pos += length;
    return result;
  }

  readListBegin(): { elemType: TTypeValue; size: number } {
    let elemType = this.readByte() as TTypeValue;
    let size = this.readI32();
    return { elemType, size };
  }

  readSetBegin(): { elemType: TTypeValue; size: number } {
    return this.readListBegin();
  }

  readMapBegin(): { keyType: TTypeValue; valueType: TTypeValue; size: number } {
    let keyType = this.readByte() as TTypeValue;
    let valueType = this.readByte() as TTypeValue;
    let size = this.readI32();
    return { keyType, valueType, size };
  }

  // Skip a field value based on its type
  skip(type: TTypeValue) {
    switch (type) {
      case TType.BOOL:
      case TType.BYTE:
        this.pos += 1;
        break;
      case TType.I16:
        this.pos += 2;
        break;
      case TType.I32:
        this.pos += 4;
        break;
      case TType.I64:
      case TType.DOUBLE:
        this.pos += 8;
        break;
      case TType.STRING: {
        let strLen = this.readI32();
        this.pos += strLen;
        break;
      }
      case TType.STRUCT:
        while (true) {
          let field = this.readFieldBegin();
          if (field.type === TType.STOP) break;
          this.skip(field.type);
        }
        break;
      case TType.MAP: {
        let mapInfo = this.readMapBegin();
        for (let i = 0; i < mapInfo.size; i++) {
          this.skip(mapInfo.keyType);
          this.skip(mapInfo.valueType);
        }
        break;
      }
      case TType.LIST:
      case TType.SET: {
        let listInfo = this.readListBegin();
        for (let i = 0; i < listInfo.size; i++) {
          this.skip(listInfo.elemType);
        }
        break;
      }
    }
  }
}

export type { TTypeValue };
export { TMessageType, TType };
