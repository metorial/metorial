import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      host: z.string().describe('MySQL server hostname or IP address'),
      port: z.number().describe('MySQL server port'),
      database: z.string().describe('Target database name'),
      username: z.string().describe('Database username'),
      password: z.string().describe('Database password'),
      sslMode: z.enum(['disabled', 'preferred', 'required']).describe('SSL connection mode'),
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
        .describe('SSL connection mode')
    }),

    getOutput: async ctx => {
      let { host, port, database, username, password, sslMode } = ctx.input;
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
} => {
  let url: URL;
  try {
    // Replace mysql:// with http:// for URL parsing
    let normalized = connStr.replace(/^mysql:\/\//, 'http://');
    url = new URL(normalized);
  } catch {
    throw new Error(
      'Invalid MySQL connection string format. Expected: mysql://user:password@host:port/dbname'
    );
  }

  let sslParam = url.searchParams.get('ssl') || url.searchParams.get('sslmode') || 'preferred';
  let validSslModes = ['disabled', 'preferred', 'required'] as const;
  let sslMode: (typeof validSslModes)[number] = validSslModes.includes(sslParam as any)
    ? (sslParam as (typeof validSslModes)[number])
    : 'preferred';

  return {
    host: url.hostname || 'localhost',
    port: url.port ? Number.parseInt(url.port, 10) : 3306,
    database: url.pathname.replace(/^\//, '') || '',
    username: decodeURIComponent(url.username || 'root'),
    password: decodeURIComponent(url.password || ''),
    sslMode
  };
};
