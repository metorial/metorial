import * as crypto from 'crypto';
import * as net from 'net';
import * as tls from 'tls';
import {
  buildComQuery,
  buildComQuit,
  buildHandshakeResponse41,
  buildPacket,
  buildSSLRequest,
  CLIENT_CONNECT_WITH_DB,
  CLIENT_DEPRECATE_EOF,
  CLIENT_FOUND_ROWS,
  CLIENT_LONG_FLAG,
  CLIENT_LONG_PASSWORD,
  CLIENT_PLUGIN_AUTH,
  CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA,
  CLIENT_PROTOCOL_41,
  CLIENT_SECURE_CONNECTION,
  CLIENT_SSL,
  type ColumnDefinition,
  getFullAuthPluginData,
  type HandshakeV10,
  isEofPacket,
  isErrPacket,
  isOkPacket,
  mysqlTypeToName,
  parseColumnDefinition41,
  parseErrPacket,
  parseHandshakeV10,
  parseOkPacket,
  parsePackets,
  parseTextResultRow,
  readLenencInt,
  UTF8MB4_GENERAL_CI
} from './protocol';

export interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode: 'disabled' | 'preferred' | 'required';
  queryTimeout?: number;
}

export interface QueryResult {
  columns: { name: string; type: string; typeId: number }[];
  rows: Record<string, any>[];
  affectedRows: number;
  lastInsertId: number;
  command: string;
}

export class MySQLClient {
  private config: ConnectionConfig;

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  async query(sql: string, timeoutMs?: number): Promise<QueryResult> {
    let timeout = timeoutMs || this.config.queryTimeout || 30000;
    let socket = await this.connect(timeout);

    try {
      let result = await this.executeQuery(socket, sql, timeout);
      await this.terminate(socket);
      return result;
    } catch (err) {
      socket.destroy();
      throw err;
    }
  }

  async multiQuery(statements: string[], timeoutMs?: number): Promise<QueryResult[]> {
    let timeout = timeoutMs || this.config.queryTimeout || 30000;
    let socket = await this.connect(timeout);

    try {
      let results: QueryResult[] = [];
      for (let sql of statements) {
        let result = await this.executeQuery(socket, sql, timeout);
        results.push(result);
      }
      await this.terminate(socket);
      return results;
    } catch (err) {
      socket.destroy();
      throw err;
    }
  }

  private connect(timeoutMs: number): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
      let timer = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Connection timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      let socket: net.Socket;

      let handleHandshake = async (sock: net.Socket) => {
        try {
          await this.performHandshake(sock, timeoutMs);
          clearTimeout(timer);
          resolve(sock);
        } catch (err) {
          clearTimeout(timer);
          sock.destroy();
          reject(err);
        }
      };

      socket = net.createConnection({
        host: this.config.host,
        port: this.config.port
      });

      socket.once('error', err => {
        clearTimeout(timer);
        reject(new Error(`Connection failed: ${err.message}`));
      });

      socket.once('connect', () => {
        handleHandshake(socket);
      });
    });
  }

  private performHandshake(socket: net.Socket, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let buffer: Uint8Array = new Uint8Array(0);
      let _handshakeDone = false;

      let timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Handshake timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      let cleanup = () => {
        clearTimeout(timer);
        socket.removeListener('data', onData);
        socket.removeListener('error', onError);
      };

      let onError = (err: Error) => {
        cleanup();
        reject(new Error(`Handshake error: ${err.message}`));
      };

      let phase:
        | 'initial'
        | 'ssl_upgrade'
        | 'auth_response'
        | 'auth_switch'
        | 'auth_more_data' = 'initial';
      let handshake: HandshakeV10 | null = null;
      let currentAuthPlugin = '';
      let authData: Uint8Array = new Uint8Array(0);
      let sequenceId = 0;

      let onData = (data: Uint8Array) => {
        let newBuf = new Uint8Array(buffer.length + data.length);
        newBuf.set(buffer);
        newBuf.set(data, buffer.length);
        buffer = newBuf;

        let { packets, remaining } = parsePackets(buffer);
        buffer = remaining;

        for (let packet of packets) {
          sequenceId = packet.sequenceId + 1;

          if (phase === 'initial') {
            // First packet should be the handshake
            if (isErrPacket(packet.payload)) {
              let err = parseErrPacket(packet.payload);
              cleanup();
              reject(new Error(`MySQL error [${err.errorCode}]: ${err.errorMessage}`));
              return;
            }

            handshake = parseHandshakeV10(packet.payload);
            authData = getFullAuthPluginData(handshake);
            currentAuthPlugin = handshake.authPluginName;

            // Determine client capability flags
            let clientFlags =
              CLIENT_LONG_PASSWORD |
              CLIENT_FOUND_ROWS |
              CLIENT_LONG_FLAG |
              CLIENT_PROTOCOL_41 |
              CLIENT_SECURE_CONNECTION |
              CLIENT_PLUGIN_AUTH |
              CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA |
              CLIENT_DEPRECATE_EOF;

            if (this.config.database) {
              clientFlags |= CLIENT_CONNECT_WITH_DB;
            }

            // Handle SSL
            if (this.config.sslMode !== 'disabled' && handshake.capabilityFlags & CLIENT_SSL) {
              clientFlags |= CLIENT_SSL;

              // Send SSL request packet
              let sslRequest = buildSSLRequest(clientFlags, 0x01000000, UTF8MB4_GENERAL_CI);
              socket.write(buildPacket(sequenceId, sslRequest));
              sequenceId++;

              phase = 'ssl_upgrade';

              // Upgrade to TLS
              let tlsOptions: tls.ConnectionOptions = {
                socket: socket,
                rejectUnauthorized: false,
                servername: this.config.host
              };

              let tlsSocket = tls.connect(tlsOptions);
              tlsSocket.once('secureConnect', () => {
                // Replace socket listeners
                socket.removeListener('data', onData);
                socket.removeListener('error', onError);

                // Send handshake response over TLS
                let authResponse = this.computeAuthResponse(
                  currentAuthPlugin,
                  this.config.password,
                  authData
                );
                let handshakeResponsePayload = buildHandshakeResponse41({
                  capabilityFlags: clientFlags,
                  maxPacketSize: 0x01000000,
                  characterSet: UTF8MB4_GENERAL_CI,
                  username: this.config.username,
                  authResponse,
                  database: this.config.database || '',
                  authPluginName: currentAuthPlugin
                });

                tlsSocket.write(buildPacket(sequenceId, handshakeResponsePayload));
                sequenceId++;
                phase = 'auth_response';

                // Set up TLS socket data handler
                tlsSocket.on('data', onData);
                tlsSocket.on('error', onError);

                // Replace socket reference in closure for terminate/query
                (socket as any).__tlsSocket = tlsSocket;
              });

              tlsSocket.once('error', err => {
                if (this.config.sslMode === 'required') {
                  cleanup();
                  reject(new Error(`SSL connection failed: ${err.message}`));
                } else {
                  // Preferred mode - fall back to non-SSL
                  // This is tricky since we already sent SSL request, so just reject
                  cleanup();
                  reject(new Error(`SSL negotiation failed: ${err.message}`));
                }
              });

              return; // Stop processing more packets, TLS handler will take over
            }

            // Non-SSL: send handshake response directly
            let authResponse = this.computeAuthResponse(
              currentAuthPlugin,
              this.config.password,
              authData
            );
            let handshakeResponsePayload = buildHandshakeResponse41({
              capabilityFlags: clientFlags,
              maxPacketSize: 0x01000000,
              characterSet: UTF8MB4_GENERAL_CI,
              username: this.config.username,
              authResponse,
              database: this.config.database || '',
              authPluginName: currentAuthPlugin
            });

            socket.write(buildPacket(sequenceId, handshakeResponsePayload));
            sequenceId++;
            phase = 'auth_response';
          } else if (
            phase === 'auth_response' ||
            phase === 'auth_switch' ||
            phase === 'auth_more_data'
          ) {
            if (isOkPacket(packet.payload)) {
              // Authentication successful
              _handshakeDone = true;
              cleanup();
              resolve();
              return;
            }

            if (isErrPacket(packet.payload)) {
              let err = parseErrPacket(packet.payload);
              cleanup();
              reject(
                new Error(`MySQL authentication error [${err.errorCode}]: ${err.errorMessage}`)
              );
              return;
            }

            // Auth switch request (0xfe)
            if (packet.payload[0] === 0xfe && phase !== 'auth_more_data') {
              let { value: pluginName, nextOffset } = readNullTerminatedStringFromPayload(
                packet.payload,
                1
              );
              currentAuthPlugin = pluginName;
              authData = packet.payload.slice(nextOffset);
              // Remove trailing null if present
              if (authData.length > 0 && authData[authData.length - 1] === 0) {
                authData = authData.slice(0, authData.length - 1);
              }

              let authResponse = this.computeAuthResponse(
                currentAuthPlugin,
                this.config.password,
                authData
              );
              socket.write(buildPacket(sequenceId, authResponse));
              sequenceId++;
              phase = 'auth_switch';
              continue;
            }

            // Auth more data (0x01) - used by caching_sha2_password
            if (packet.payload[0] === 0x01) {
              let statusTag = packet.payload[1];

              if (statusTag === 0x03) {
                // Fast auth success - next packet should be OK
                phase = 'auth_more_data';
                continue;
              }

              if (statusTag === 0x04) {
                // Full auth required - send password in cleartext over secure connection
                // This is safe because we should be over TLS or the server uses RSA
                let encoder = new TextEncoder();
                let passwordBytes = encoder.encode(this.config.password);
                let payload = new Uint8Array(passwordBytes.length + 1);
                payload.set(passwordBytes);
                payload[passwordBytes.length] = 0; // null terminated

                socket.write(buildPacket(sequenceId, payload));
                sequenceId++;
                phase = 'auth_more_data';
              }
            }
          }
        }
      };

      socket.on('data', onData);
      socket.on('error', onError);
    });
  }

  private computeAuthResponse(
    pluginName: string,
    password: string,
    authData: Uint8Array
  ): Uint8Array {
    if (!password) {
      return new Uint8Array(0);
    }

    if (pluginName === 'mysql_native_password') {
      return this.nativePasswordAuth(password, authData);
    }

    if (pluginName === 'caching_sha2_password') {
      return this.cachingSha2PasswordAuth(password, authData);
    }

    if (pluginName === 'sha256_password') {
      // For sha256_password over secure connection, send cleartext
      let encoder = new TextEncoder();
      let passwordBytes = encoder.encode(password);
      let buf = new Uint8Array(passwordBytes.length + 1);
      buf.set(passwordBytes);
      buf[passwordBytes.length] = 0;
      return buf;
    }

    // Unknown plugin, try native password as fallback
    return this.nativePasswordAuth(password, authData);
  }

  private nativePasswordAuth(password: string, authData: Uint8Array): Uint8Array {
    // SHA1(password) XOR SHA1(scramble + SHA1(SHA1(password)))
    let passwordHash = sha1(password);
    let doubleHash = sha1Bytes(passwordHash);
    let combined = new Uint8Array(authData.length + doubleHash.length);
    combined.set(authData);
    combined.set(doubleHash, authData.length);
    let scrambleHash = sha1Bytes(combined);
    let result = new Uint8Array(20);
    for (let i = 0; i < 20; i++) {
      result[i] = passwordHash[i]! ^ scrambleHash[i]!;
    }
    return result;
  }

  private cachingSha2PasswordAuth(password: string, authData: Uint8Array): Uint8Array {
    // SHA256(password) XOR SHA256(SHA256(SHA256(password)) + authData)
    let passwordHash = sha256(password);
    let doubleHash = sha256Bytes(passwordHash);
    let combined = new Uint8Array(doubleHash.length + authData.length);
    combined.set(doubleHash);
    combined.set(authData, doubleHash.length);
    let scrambleHash = sha256Bytes(combined);
    let result = new Uint8Array(passwordHash.length);
    for (let i = 0; i < passwordHash.length; i++) {
      result[i] = passwordHash[i]! ^ scrambleHash[i]!;
    }
    return result;
  }

  private executeQuery(
    socket: net.Socket,
    sql: string,
    timeoutMs: number
  ): Promise<QueryResult> {
    // Use TLS socket if available
    let activeSocket: net.Socket = (socket as any).__tlsSocket || socket;

    return new Promise((resolve, reject) => {
      let buffer: Uint8Array = new Uint8Array(0);
      let columns: ColumnDefinition[] = [];
      let rows: (string | null)[][] = [];
      let columnCount = 0;
      let phase: 'column_count' | 'column_defs' | 'column_eof' | 'rows' | 'done' =
        'column_count';
      let deprecateEof = true; // assume CLIENT_DEPRECATE_EOF

      let timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Query timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      let cleanup = () => {
        clearTimeout(timer);
        activeSocket.removeListener('data', onData);
        activeSocket.removeListener('error', onError);
      };

      let onError = (err: Error) => {
        cleanup();
        reject(new Error(`Query error: ${err.message}`));
      };

      let processPackets = () => {
        let { packets, remaining } = parsePackets(buffer);
        buffer = remaining;

        for (let packet of packets) {
          let payload = packet.payload;

          if (phase === 'column_count') {
            // First response packet
            if (isErrPacket(payload)) {
              let err = parseErrPacket(payload);
              cleanup();
              reject(
                new Error(
                  `MySQL query error [${err.errorCode}] ${err.sqlState ? `(${err.sqlState})` : ''}: ${err.errorMessage}`
                )
              );
              return;
            }

            if (isOkPacket(payload)) {
              // Non-result-set response (INSERT, UPDATE, DELETE, DDL, etc.)
              let ok = parseOkPacket(payload);
              let command = guessCommand(sql);
              cleanup();
              resolve({
                columns: [],
                rows: [],
                affectedRows: ok.affectedRows,
                lastInsertId: ok.lastInsertId,
                command
              });
              return;
            }

            // Column count (lenenc int)
            let { value } = readLenencInt(payload, 0);
            columnCount = value;
            columns = [];
            rows = [];
            phase = 'column_defs';
            continue;
          }

          if (phase === 'column_defs') {
            if (isErrPacket(payload)) {
              let err = parseErrPacket(payload);
              cleanup();
              reject(new Error(`MySQL query error [${err.errorCode}]: ${err.errorMessage}`));
              return;
            }

            // With CLIENT_DEPRECATE_EOF, no EOF after column definitions
            // Column definition packets
            if (!isEofPacket(payload) && !isOkPacket(payload)) {
              columns.push(parseColumnDefinition41(payload));
              if (columns.length >= columnCount) {
                phase = deprecateEof ? 'rows' : 'column_eof';
              }
              continue;
            }

            // EOF packet (non-deprecate mode)
            if (isEofPacket(payload)) {
              phase = 'rows';
              continue;
            }
          }

          if (phase === 'column_eof') {
            // Waiting for EOF after column definitions
            if (isEofPacket(payload)) {
              phase = 'rows';
              continue;
            }
          }

          if (phase === 'rows') {
            if (isErrPacket(payload)) {
              let err = parseErrPacket(payload);
              cleanup();
              reject(new Error(`MySQL query error [${err.errorCode}]: ${err.errorMessage}`));
              return;
            }

            // End of rows: EOF packet (non-deprecate) or OK packet (deprecate_eof)
            if (isEofPacket(payload) || (isOkPacket(payload) && payload.length > 7)) {
              // Check if this is an OK packet that signals end of result set
              let ok = isOkPacket(payload) ? parseOkPacket(payload) : null;
              let command = guessCommand(sql);

              let mappedColumns = columns.map(col => ({
                name: col.name,
                type: mysqlTypeToName(col.columnType),
                typeId: col.columnType
              }));

              let mappedRows = rows.map(row => {
                let obj: Record<string, any> = {};
                for (let i = 0; i < columns.length; i++) {
                  let col = columns[i]!;
                  let value = row[i] ?? null;
                  obj[col.name] = castValue(value, col.columnType);
                }
                return obj;
              });

              cleanup();
              resolve({
                columns: mappedColumns,
                rows: mappedRows,
                affectedRows: ok?.affectedRows ?? rows.length,
                lastInsertId: ok?.lastInsertId ?? 0,
                command
              });
              return;
            }

            // Data row
            rows.push(parseTextResultRow(payload, columnCount));
          }
        }
      };

      let onData = (data: Uint8Array) => {
        let newBuf = new Uint8Array(buffer.length + data.length);
        newBuf.set(buffer);
        newBuf.set(data, buffer.length);
        buffer = newBuf;
        processPackets();
      };

      activeSocket.on('data', onData);
      activeSocket.on('error', onError);

      // Send COM_QUERY
      let queryPayload = buildComQuery(sql);
      activeSocket.write(buildPacket(0, queryPayload));
    });
  }

  private terminate(socket: net.Socket): Promise<void> {
    let activeSocket: net.Socket = (socket as any).__tlsSocket || socket;

    return new Promise(resolve => {
      try {
        let quitPayload = buildComQuit();
        activeSocket.write(buildPacket(0, quitPayload));
      } catch {
        // Ignore write errors during termination
      }
      activeSocket.end();
      activeSocket.once('close', () => resolve());
      setTimeout(() => {
        activeSocket.destroy();
        socket.destroy();
        resolve();
      }, 1000);
    });
  }
}

// Helper to read null-terminated string from payload
let readNullTerminatedStringFromPayload = (
  payload: Uint8Array,
  offset: number
): { value: string; nextOffset: number } => {
  let decoder = new TextDecoder();
  let end = payload.indexOf(0, offset);
  if (end === -1) end = payload.length;
  let value = decoder.decode(payload.slice(offset, end));
  return { value, nextOffset: end + 1 };
};

// SHA-1 helpers
let sha1 = (data: string): Uint8Array => {
  let encoder = new TextEncoder();
  return new Uint8Array(crypto.createHash('sha1').update(encoder.encode(data)).digest());
};

let sha1Bytes = (data: Uint8Array): Uint8Array => {
  return new Uint8Array(crypto.createHash('sha1').update(data).digest());
};

// SHA-256 helpers
let sha256 = (data: string): Uint8Array => {
  let encoder = new TextEncoder();
  return new Uint8Array(crypto.createHash('sha256').update(encoder.encode(data)).digest());
};

let sha256Bytes = (data: Uint8Array): Uint8Array => {
  return new Uint8Array(crypto.createHash('sha256').update(data).digest());
};

// Guess the SQL command from the query string
let guessCommand = (sql: string): string => {
  let trimmed = sql.trim().toUpperCase();
  let firstWord = trimmed.split(/\s+/)[0] || '';
  return firstWord;
};

// Cast MySQL text protocol values to appropriate JS types
let castValue = (value: string | null, typeId: number): any => {
  if (value === null) return null;

  switch (typeId) {
    case 0x01: // TINY
    case 0x02: // SHORT
    case 0x03: // LONG
    case 0x08: // LONGLONG
    case 0x09: // INT24
    case 0x0d: // YEAR
      return Number.parseInt(value, 10);
    case 0x04: // FLOAT
    case 0x05: // DOUBLE
    case 0x00: // DECIMAL
    case 0xf6: // NEWDECIMAL
      return Number.parseFloat(value);
    case 0xf5: // JSON
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    default:
      return value;
  }
};
