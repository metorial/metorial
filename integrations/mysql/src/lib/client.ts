import type { ConnectionOptions, FieldPacket, ResultSetHeader } from 'mysql2/promise';
import * as mysql from 'mysql2/promise';
import { mysqlApiError } from './errors';

export interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode: 'disabled' | 'preferred' | 'required';
  sslCa?: string;
  sslRejectUnauthorized?: boolean;
  queryTimeout?: number;
}

export interface QueryResult {
  columns: { name: string; type: string; typeId: number }[];
  rows: Record<string, unknown>[];
  affectedRows: number;
  lastInsertId: number;
  command: string;
}

let mysqlTypeNames: Record<number, string> = {
  0: 'decimal',
  1: 'tinyint',
  2: 'smallint',
  3: 'int',
  4: 'float',
  5: 'double',
  6: 'null',
  7: 'timestamp',
  8: 'bigint',
  9: 'mediumint',
  10: 'date',
  11: 'time',
  12: 'datetime',
  13: 'year',
  14: 'date',
  15: 'varchar',
  16: 'bit',
  245: 'json',
  246: 'decimal',
  247: 'enum',
  248: 'set',
  249: 'tinyblob',
  250: 'mediumblob',
  251: 'longblob',
  252: 'blob',
  253: 'varchar',
  254: 'char',
  255: 'geometry'
};

let guessCommand = (sql: string): string => {
  let trimmed = sql.trim().toUpperCase();
  return trimmed.split(/\s+/)[0] || '';
};

let fieldTypeId = (field: FieldPacket) => {
  let candidate = field as FieldPacket & { columnType?: number; type?: number };
  return candidate.columnType ?? candidate.type ?? -1;
};

let normalizeRows = (rows: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(rows)) return [];

  let first = rows[0];
  if (Array.isArray(first)) {
    return first.filter(row => typeof row === 'object' && row !== null) as Record<
      string,
      unknown
    >[];
  }

  return rows.filter(row => typeof row === 'object' && row !== null) as Record<
    string,
    unknown
  >[];
};

let isResultSetHeader = (value: unknown): value is ResultSetHeader =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  'affectedRows' in value;

export class MySQLClient {
  private config: ConnectionConfig;

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  async query(sql: string, timeoutMs?: number): Promise<QueryResult> {
    let timeout = timeoutMs || this.config.queryTimeout || 30000;
    let connection: mysql.Connection | undefined;

    try {
      connection = await mysql.createConnection(this.connectionOptions(timeout));
      let [rows, fields] = await connection.query({ sql, timeout, rowsAsArray: false });
      return this.toQueryResult(sql, rows, fields);
    } catch (error) {
      throw mysqlApiError(error, 'query');
    } finally {
      if (connection) {
        await connection.end().catch(() => undefined);
      }
    }
  }

  async multiQuery(statements: string[], timeoutMs?: number): Promise<QueryResult[]> {
    let results: QueryResult[] = [];
    for (let statement of statements) {
      results.push(await this.query(statement, timeoutMs));
    }
    return results;
  }

  private connectionOptions(timeout: number): ConnectionOptions {
    let options: ConnectionOptions = {
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database || undefined,
      connectTimeout: timeout,
      namedPlaceholders: true,
      multipleStatements: false,
      rowsAsArray: false,
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: true,
      decimalNumbers: false,
      charset: 'utf8mb4'
    };

    if (this.config.sslMode !== 'disabled') {
      options.ssl = {
        ca: this.config.sslCa,
        rejectUnauthorized: this.config.sslRejectUnauthorized ?? true
      };
    }

    return options;
  }

  private toQueryResult(
    sql: string,
    rows: unknown,
    fields: FieldPacket[] | FieldPacket[][] | undefined
  ): QueryResult {
    let command = guessCommand(sql);

    if (isResultSetHeader(rows)) {
      return {
        columns: [],
        rows: [],
        affectedRows: rows.affectedRows ?? 0,
        lastInsertId: rows.insertId ?? 0,
        command
      };
    }

    let flatFields = Array.isArray(fields?.[0])
      ? ((fields as FieldPacket[][])[0] ?? [])
      : ((fields as FieldPacket[] | undefined) ?? []);

    let normalizedRows = normalizeRows(rows);
    let columns = flatFields.map(field => {
      let typeId = fieldTypeId(field);
      return {
        name: field.name,
        type: mysqlTypeNames[typeId] ?? `type_${typeId}`,
        typeId
      };
    });

    return {
      columns,
      rows: normalizedRows,
      affectedRows: normalizedRows.length,
      lastInsertId: 0,
      command
    };
  }
}
