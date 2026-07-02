import { type ConnectionConfig, MySQLClient } from './client';

export interface AuthOutput {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode: 'disabled' | 'preferred' | 'required';
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
    queryTimeout: config.queryTimeout
  };
  return new MySQLClient(connectionConfig);
};

// Escape an identifier (table name, column name, etc.) for safe use in MySQL SQL
export let escapeIdentifier = (name: string): string => {
  return `\`${name.replace(/`/g, '``')}\``;
};

// Escape a literal value for safe use in MySQL SQL
export let escapeLiteral = (value: string): string => {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\0/g, '\\0')}'`;
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
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'object') return escapeLiteral(JSON.stringify(val));
  return escapeLiteral(String(val));
};
