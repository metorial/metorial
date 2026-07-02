import { ServiceError } from '@lowerdeck/error';
import { SlateAuth } from 'slates';
import { z } from 'zod';
import { mysqlServiceError } from './lib/errors';

export let auth = SlateAuth.create()
  .output(
    z.object({
      host: z.string().describe('MySQL server hostname or IP address'),
      port: z.number().describe('MySQL server port'),
      database: z.string().describe('Target database name'),
      username: z.string().describe('Database username'),
      password: z.string().describe('Database password'),
      sslMode: z.enum(['disabled', 'preferred', 'required']).describe('SSL connection mode'),
      sslCa: z.string().optional().describe('PEM-encoded CA certificate for SSL connections'),
      sslRejectUnauthorized: z
        .boolean()
        .optional()
        .describe('Whether SSL connections must reject unauthorized certificates'),
      connectionString: z.string().describe('Full MySQL connection URI')
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
          'MySQL connection URI (e.g., mysql://user:password@host:3306/dbname?ssl=required)'
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
          sslCa: parsed.sslCa,
          sslRejectUnauthorized: parsed.sslRejectUnauthorized,
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
      host: z.string().describe('MySQL server hostname or IP address'),
      port: z.number().default(3306).describe('MySQL server port (default: 3306)'),
      database: z.string().describe('Target database name'),
      username: z.string().describe('Database username'),
      password: z.string().describe('Database password'),
      sslMode: z
        .enum(['disabled', 'preferred', 'required'])
        .default('preferred')
        .describe('SSL connection mode'),
      sslCa: z.string().optional().describe('PEM-encoded CA certificate for SSL connections'),
      sslRejectUnauthorized: z
        .boolean()
        .optional()
        .default(true)
        .describe('Reject unauthorized SSL certificates when SSL is enabled')
    }),

    getOutput: async ctx => {
      let { host, port, database, username, password, sslMode, sslCa, sslRejectUnauthorized } =
        ctx.input;
      let encodedPassword = encodeURIComponent(password);
      let encodedUsername = encodeURIComponent(username);
      let sslParam = sslMode !== 'disabled' ? `?ssl=${sslMode}` : '';
      let connectionString = `mysql://${encodedUsername}:${encodedPassword}@${host}:${port}/${database}${sslParam}`;

      return {
        output: {
          host,
          port,
          database,
          username,
          password,
          sslMode,
          sslCa,
          sslRejectUnauthorized,
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
  sslMode: 'disabled' | 'preferred' | 'required';
  sslCa?: string;
  sslRejectUnauthorized: boolean;
} => {
  let url: URL;
  if (!/^mysql:\/\//i.test(connStr)) {
    throw mysqlServiceError(
      'Invalid MySQL connection string format. Expected: mysql://user:password@host:port/dbname'
    );
  }

  try {
    let normalized = connStr.replace(/^mysql:\/\//i, 'http://');
    url = new URL(normalized);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw mysqlServiceError(
      'Invalid MySQL connection string format. Expected: mysql://user:password@host:port/dbname'
    );
  }

  let sslMode = parseSslMode(
    url.searchParams.get('ssl') || url.searchParams.get('sslmode') || 'preferred'
  );
  let sslRejectUnauthorized = parseBooleanParam(
    url.searchParams.get('sslRejectUnauthorized') ||
      url.searchParams.get('sslrejectunauthorized'),
    true,
    'sslRejectUnauthorized'
  );

  return {
    host: url.hostname || 'localhost',
    port: url.port ? Number.parseInt(url.port, 10) : 3306,
    database: url.pathname.replace(/^\//, '') || '',
    username: decodeURIComponent(url.username || 'root'),
    password: decodeURIComponent(url.password || ''),
    sslMode,
    sslCa: url.searchParams.get('sslCa') || url.searchParams.get('sslca') || undefined,
    sslRejectUnauthorized
  };
};

let parseSslMode = (value: string): 'disabled' | 'preferred' | 'required' => {
  let normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return 'required';
  if (normalized === 'false' || normalized === '0') return 'disabled';
  if (['disabled', 'preferred', 'required'].includes(normalized)) {
    return normalized as 'disabled' | 'preferred' | 'required';
  }
  throw mysqlServiceError('ssl must be one of disabled, preferred, required, true, or false.');
};

let parseBooleanParam = (value: string | null, defaultValue: boolean, label: string) => {
  if (value === null) return defaultValue;
  let normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  throw mysqlServiceError(`${label} must be true or false.`);
};
