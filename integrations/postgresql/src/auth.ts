import { SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { postgresServiceError } from './lib/errors';

export let auth = SlateAuth.create()
  .output(
    z.object({
      host: z.string().describe('PostgreSQL server hostname or IP address'),
      port: z.number().describe('PostgreSQL server port'),
      database: z.string().describe('Target database name'),
      username: z.string().describe('Database username'),
      password: z.string().describe('Database password'),
      sslMode: z
        .enum(['disable', 'require', 'verify-ca', 'verify-full'])
        .describe('SSL connection mode'),
      connectionString: z.string().describe('Full PostgreSQL connection URI')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Connection String',
    key: 'connection_string',

    inputSchema: z.object({
      connectionString: z
        .string()
        .describe(
          'PostgreSQL connection URI (e.g., postgresql://user:password@host:5432/dbname?sslmode=require)'
        )
    }),

    getOutput: async ctx => {
      let connStr = ctx.input.connectionString.trim();
      let parsed = parseConnectionString(connStr);

      return {
        output: {
          host: parsed.host,
          port: parsed.port,
          database: parsed.database,
          username: parsed.username,
          password: parsed.password,
          sslMode: parsed.sslMode,
          connectionString: connStr
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Connection Parameters',
    key: 'connection_params',

    inputSchema: z.object({
      host: z.string().describe('PostgreSQL server hostname or IP address'),
      port: z.number().default(5432).describe('PostgreSQL server port (default: 5432)'),
      database: z.string().describe('Target database name'),
      username: z.string().describe('Database username'),
      password: z.string().describe('Database password'),
      sslMode: z
        .enum(['disable', 'require', 'verify-ca', 'verify-full'])
        .default('require')
        .describe('SSL connection mode')
    }),

    getOutput: async ctx => {
      let { host, port, database, username, password, sslMode } = ctx.input;
      let encodedPassword = encodeURIComponent(password);
      let encodedUsername = encodeURIComponent(username);
      let sslParam = sslMode !== 'disable' ? `?sslmode=${sslMode}` : '';
      let connectionString = `postgresql://${encodedUsername}:${encodedPassword}@${host}:${port}/${database}${sslParam}`;

      return {
        output: {
          host,
          port,
          database,
          username,
          password,
          sslMode,
          connectionString
        }
      };
    }
  });

let parseConnectionString = (
  connStr: string
): {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode: 'disable' | 'require' | 'verify-ca' | 'verify-full';
} => {
  // Parse postgresql://user:password@host:port/dbname?sslmode=require
  let url: URL;
  try {
    url = new URL(connStr);
  } catch {
    throw postgresServiceError(
      'Invalid PostgreSQL connection string format. Expected: postgresql://user:password@host:port/dbname'
    );
  }

  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw postgresServiceError(
      'Invalid PostgreSQL connection string protocol. Use postgresql:// or postgres://.'
    );
  }

  let sslModeParam = url.searchParams.get('sslmode') || 'disable';
  let validSslModes = ['disable', 'require', 'verify-ca', 'verify-full'] as const;
  if (!validSslModes.includes(sslModeParam as (typeof validSslModes)[number])) {
    throw postgresServiceError(
      `Unsupported sslmode "${sslModeParam}". Supported values are disable, require, verify-ca, and verify-full.`
    );
  }

  let port = url.port ? Number.parseInt(url.port, 10) : 5432;
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw postgresServiceError('Invalid PostgreSQL port in connection string.');
  }

  return {
    host: url.hostname || 'localhost',
    port,
    database: url.pathname.replace(/^\//, '') || 'postgres',
    username: decodeURIComponent(url.username || 'postgres'),
    password: decodeURIComponent(url.password || ''),
    sslMode: sslModeParam as (typeof validSslModes)[number]
  };
};
