import { createAxios, getOAuthExpiresAtFromExpiresIn, SlateAuth } from 'slates';
import { z } from 'zod';
import { credential, instance, requireValue, safeJson, upstream } from './lib/contracts';

const inputSchema = z.object({
  instanceUrl: z
    .string()
    .describe('HTTPS root URL of the Coupa instance that issued these credentials'),
  clientId: z.string().describe('Coupa OAuth client identifier'),
  clientSecret: z.string().describe('Coupa OAuth client secret'),
  scopes: z
    .string()
    .describe(
      'Space-separated scopes explicitly enabled on this client; no extra permissions are requested'
    )
});
async function exchange(input: z.infer<typeof inputSchema>) {
  const binding = JSON.stringify(input);
  const saved = { ...input };
  const origin = instance(saved.instanceUrl);
  credential(input.clientId);
  credential(input.clientSecret);
  const scopes = saved.scopes.trim().split(/\s+/);
  requireValue(
    scopes.length > 0 &&
      scopes.length <= 200 &&
      scopes.every(s => /^[a-zA-Z0-9_.:-]+$/.test(s)),
    'Provide the space-separated Coupa scopes configured on this client.'
  );
  const http = createAxios({
    baseURL: origin,
    timeout: 30000,
    maxRedirects: 0,
    maxContentLength: 1024 * 1024,
    maxBodyLength: 16384,
    errorMapping: {
      defaults: { message: 'Coupa token exchange failed.' },
      extractResponseData: () => ({})
    }
  });
  const form = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: input.clientId,
    client_secret: input.clientSecret,
    scope: scopes.join(' ')
  });
  try {
    const response = await http.post('/oauth2/token', form.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      }
    });
    requireValue(
      JSON.stringify(input) === binding,
      'Coupa connection input changed during token exchange. Reconnect using the original instance and credentials.'
    );
    safeJson(
      {
        body: response.data,
        headers:
          typeof response.headers.toJSON === 'function'
            ? response.headers.toJSON()
            : response.headers,
        statusText: response.statusText
      },
      [saved.clientId, saved.clientSecret],
      true
    );
    requireValue(
      response.status === 200 &&
        response.data &&
        typeof response.data === 'object' &&
        !Array.isArray(response.data),
      'Coupa returned an invalid token response.'
    );
    credential(response.data.access_token, 1024 * 1024);
    requireValue(
      response.data.token_type === undefined ||
        String(response.data.token_type).toLowerCase() === 'bearer',
      'Coupa returned an unsupported token type.'
    );
    const granted =
      typeof response.data.scope === 'string'
        ? response.data.scope.trim().split(/\s+/)
        : scopes;
    requireValue(
      granted.every((s: string) => scopes.includes(s)),
      'Coupa returned unexpected scopes. Reconnect with the intended client and scope list.'
    );
    requireValue(
      Number.isSafeInteger(Number(response.data.expires_in)) &&
        Number(response.data.expires_in) > 0 &&
        Number(response.data.expires_in) <= 31536000,
      'Coupa returned an invalid token lifetime.'
    );
    const expiresAt = getOAuthExpiresAtFromExpiresIn(response.data.expires_in, {
      providerLabel: 'Coupa',
      required: true
    });
    return {
      output: {
        token: response.data.access_token as string,
        instanceUrl: origin,
        mode: 'oauth_client_credentials' as const,
        scopes: granted,
        expiresAt
      },
      scopes: granted
    };
  } catch (error) {
    throw upstream(error);
  }
}
export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      instanceUrl: z.string().optional(),
      mode: z.enum(['oauth_client_credentials', 'api_key']).optional(),
      scopes: z.array(z.string()).optional(),
      expiresAt: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'OAuth 2.0 Client Credentials',
    key: 'oauth_client_credentials',
    inputSchema,
    getOutput: ctx => exchange(ctx.input),
    handleTokenRefresh: async (ctx: {
      input: z.infer<typeof inputSchema>;
      output: {
        token: string;
        instanceUrl?: string;
        mode?: 'api_key' | 'oauth_client_credentials';
        scopes?: string[];
        expiresAt?: string;
      };
      clientId: string;
      clientSecret: string;
      scopes: string[];
      config?: Record<string, unknown>;
    }) => {
      requireValue(
        !ctx.output.instanceUrl ||
          instance(ctx.output.instanceUrl) === instance(ctx.input.instanceUrl),
        'Stored Coupa instance differs from the original connection. Reconnect instead of renewing across instances.'
      );
      requireValue(
        !ctx.output.mode || ctx.output.mode === 'oauth_client_credentials',
        'This connection is not an OAuth client-credentials connection.'
      );
      const original = ctx.input.scopes.trim().split(/\s+/);
      requireValue(
        !ctx.output.scopes || ctx.output.scopes.every(s => original.includes(s)),
        'Stored Coupa scopes differ from the original connection. Reconnect to change permissions.'
      );
      return exchange(ctx.input);
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key (Deprecated)',
    key: 'api_key',
    inputSchema: z.object({
      instanceUrl: z
        .string()
        .describe('HTTPS root URL of the Coupa instance that issued this key'),
      apiKey: z.string().describe('Existing Coupa API key; OAuth migration is recommended')
    }),
    getOutput: async ctx => {
      credential(ctx.input.apiKey, 1024 * 1024);
      return {
        output: {
          token: ctx.input.apiKey,
          instanceUrl: instance(ctx.input.instanceUrl),
          mode: 'api_key' as const
        }
      };
    }
  });
