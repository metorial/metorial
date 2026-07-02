import * as mysql from 'mysql2';
import { type ConnectionConfig, MySQLClient } from './client';
import { mysqlServiceError } from './errors';

export interface AuthOutput {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode: 'disabled' | 'preferred' | 'required';
  sslCa?: string;
  sslRejectUnauthorized?: boolean;
  connectionString: string;
}

export interface ConfigOutput {
  defaultDatabase?: string;
  queryTimeout: number;
  maxRows: number;
}

export let createClient = (auth: AuthOutput, config: ConfigOutput): MySQLClient => {
  let connectionConfig: ConnectionConfig = {
    host: auth.host,
    port: auth.port,
    database: auth.database || config.defaultDatabase || '',
    username: auth.username,
    password: auth.password,
    sslMode: auth.sslMode,
    sslCa: auth.sslCa,
    sslRejectUnauthorized: auth.sslRejectUnauthorized ?? true,
    queryTimeout: config.queryTimeout
  };
  return new MySQLClient(connectionConfig);
};

export let escapeIdentifier = (name: string): string => {
  return mysql.escapeId(name);
};

export let escapeLiteral = (value: string): string => {
  return mysql.escape(value);
};

// Build a qualified table name with optional database prefix
export let qualifiedTableName = (tableName: string, databaseName?: string): string => {
  if (databaseName) {
    return `${escapeIdentifier(databaseName)}.${escapeIdentifier(tableName)}`;
  }
  return escapeIdentifier(tableName);
};

// Format a value for SQL insertion
export let formatValue = (val: any): string => {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'object' && !(val instanceof Date) && !Buffer.isBuffer(val)) {
    return mysql.escape(JSON.stringify(val));
  }
  return mysql.escape(val);
};

export let validateSqlOptionName = (value: string, label: string) => {
  let trimmed = value.trim();
  if (!/^[A-Za-z0-9_$]+$/.test(trimmed)) {
    throw mysqlServiceError(
      `${label} may contain only letters, numbers, underscores, or dollar signs.`
    );
  }
  return trimmed;
};
