import { SlateAuth } from 'slates';
import { z } from 'zod';
import {
  authenticateOdooJson2,
  authenticateOdooJsonRpc,
  detectOdooVersion,
  normalizeOdooInstanceUrl,
  type OdooTransport
} from './lib/client';

type AuthOutput = {
  token: string;
  username: string;
  uid: number;
  instanceUrl?: string;
  database?: string;
  transport?: OdooTransport;
  serverVersion?: string;
};

type ApiKeyInput = {
  username: string;
  token: string;
  instanceUrl: string;
  database?: string;
};

type PasswordInput = {
  username: string;
  password: string;
  instanceUrl: string;
  database: string;
};

let authOutputSchema = z.object({
  token: z.string(),
  username: z.string(),
  uid: z.number(),
  // Optional fields keep stored auth from versions before transport binding valid.
  instanceUrl: z.string().optional(),
  database: z.string().optional(),
  transport: z.enum(['json2', 'jsonrpc']).optional(),
  serverVersion: z.string().optional()
});

let normalizedDatabase = (database: string | undefined) => {
  let normalized = database?.trim();
  return normalized ? normalized : undefined;
};

let profileFor = (output: AuthOutput) => {
  let profile = { id: String(output.uid) } as {
    id: string;
    email?: string;
    name?: string;
  };

  // JSON-2 authenticates only the bearer key; its username input is not
  // verified. Legacy authenticate does verify the supplied login.
  if (output.transport !== 'json2') {
    profile.email = output.username;
    profile.name = output.username;
  }

  return { profile };
};

export let auth = SlateAuth.create()
  .output(authOutputSchema)
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      username: z.string().describe('Login email for the Odoo user'),
      token: z
        .string()
        .describe(
          'API key generated from the Odoo account security settings. Odoo 19 and newer use it as a bearer credential for JSON-2.'
        ),
      instanceUrl: z
        .string()
        .describe('The URL of the Odoo instance (e.g., https://mycompany.odoo.com)'),
      database: z
        .string()
        .optional()
        .describe(
          'Database name. Required for legacy Odoo servers and multi-database Odoo 19+ deployments; otherwise optional.'
        )
    }),

    getOutput: async (ctx: { input: ApiKeyInput }) => {
      let instanceUrl = normalizeOdooInstanceUrl(ctx.input.instanceUrl);
      let database = normalizedDatabase(ctx.input.database);
      let version = await detectOdooVersion(instanceUrl);
      let uid =
        version.transport === 'json2'
          ? await authenticateOdooJson2({
              instanceUrl,
              database,
              token: ctx.input.token
            })
          : await authenticateOdooJsonRpc({
              instanceUrl,
              database: database ?? '',
              username: ctx.input.username,
              token: ctx.input.token
            });

      return {
        output: {
          token: ctx.input.token,
          username: ctx.input.username,
          uid,
          instanceUrl,
          database,
          transport: version.transport,
          serverVersion: version.version
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput; input: ApiKeyInput }) =>
      profileFor(ctx.output)
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Legacy — Username & Password',
    key: 'username_password',

    inputSchema: z.object({
      username: z.string().describe('Login email for the Odoo user'),
      password: z.string().describe('Password for the Odoo user'),
      instanceUrl: z
        .string()
        .describe('The URL of the Odoo instance (e.g., https://mycompany.odoo.com)'),
      database: z.string().describe('The Odoo database name')
    }),

    getOutput: async (ctx: { input: PasswordInput }) => {
      let instanceUrl = normalizeOdooInstanceUrl(ctx.input.instanceUrl);
      let database = ctx.input.database.trim();
      let version = await detectOdooVersion(instanceUrl);
      let uid = await authenticateOdooJsonRpc({
        instanceUrl,
        database,
        username: ctx.input.username,
        token: ctx.input.password
      });

      return {
        output: {
          token: ctx.input.password,
          username: ctx.input.username,
          uid,
          instanceUrl,
          database,
          transport: 'jsonrpc' as const,
          serverVersion: version.version
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput; input: PasswordInput }) =>
      profileFor(ctx.output)
  });
