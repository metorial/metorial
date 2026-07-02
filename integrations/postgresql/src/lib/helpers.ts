import { type ConnectionConfig, PostgresClient } from './client';

export interface AuthOutput {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode: 'disable' | 'require' | 'verify-ca' | 'verify-full';
  connectionString: string;
}

export interface ConfigOutput {
  defaultSchema: string;
  queryTimeout: number;
  maxRows: number;
}

export let createClient = (auth: AuthOutput, config: ConfigOutput): PostgresClient => {
  let connectionConfig: ConnectionConfig = {
    host: auth.host,
    port: auth.port,
    database: auth.database,
    username: auth.username,
    password: auth.password,
    sslMode: auth.sslMode,
    queryTimeout: config.queryTimeout
  };
  return new PostgresClient(connectionConfig);
};

// Escape an identifier (table name, column name, etc.) for safe use in SQL
export let escapeIdentifier = (name: string): string => {
  return `"${name.replace(/"/g, '""')}"`;
};

// Escape a literal value for safe use in SQL
export let escapeLiteral = (value: string): string => {
  return `'${value.replace(/'/g, "''")}'`;
};

// Build a qualified table name with optional schema
export let qualifiedTableName = (tableName: string, schemaName?: string): string => {
  if (schemaName) {
    return `${escapeIdentifier(schemaName)}.${escapeIdentifier(tableName)}`;
  }
  return escapeIdentifier(tableName);
};
