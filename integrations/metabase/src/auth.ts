import { buildApiServiceError, createApiServiceError, createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { type MetabaseAuthMethod, MetabaseClient } from './lib/client';

let outputSchema = z.object({
  token: z.string(),
  instanceUrl: z.string(),
  authMethod: z.enum(['api_key', 'session']).optional()
});

type AuthOutput = z.infer<typeof outputSchema>;

let normalizeInstanceUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw createApiServiceError('Enter a valid absolute Metabase instance URL.', {
      reason: 'metabase_instance_url_invalid'
    });
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw createApiServiceError(
      'The Metabase instance URL must use HTTP or HTTPS and must not contain credentials.',
      { reason: 'metabase_instance_url_invalid' }
    );
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/+$/, '');
};

let getProfile = async (output: AuthOutput) => {
  let client = new MetabaseClient({
    token: output.token,
    instanceUrl: output.instanceUrl,
    authMethod: output.authMethod as MetabaseAuthMethod | undefined
  });
  let user = await client.getCurrentUser();
  if (typeof user?.id !== 'number' || typeof user?.email !== 'string') {
    throw createApiServiceError('Metabase returned an invalid current-user profile.', {
      reason: 'metabase_profile_invalid'
    });
  }
  return {
    profile: {
      id: String(user.id),
      email: user.email,
      name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined
    }
  };
};

export let auth = SlateAuth.create()
  .output(outputSchema)
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .min(1)
        .describe('Metabase API key (created in Admin Settings > Authentication > API Keys)'),
      instanceUrl: z
        .string()
        .min(1)
        .describe('Base URL of the Metabase instance, such as https://metabase.example.com')
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.token,
        instanceUrl: normalizeInstanceUrl(ctx.input.instanceUrl),
        authMethod: 'api_key' as const
      }
    }),
    getProfile: async (ctx: { output: AuthOutput }) => await getProfile(ctx.output)
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Username & Password',
    key: 'session_token',
    inputSchema: z.object({
      username: z.string().min(1).describe('Metabase email address'),
      password: z.string().min(1).describe('Metabase password'),
      instanceUrl: z
        .string()
        .min(1)
        .describe('Base URL of the Metabase instance, such as https://metabase.example.com')
    }),
    getOutput: async ctx => {
      let instanceUrl = normalizeInstanceUrl(ctx.input.instanceUrl);
      try {
        let http = createAxios({ baseURL: `${instanceUrl}/api` });
        let response = await http.post('/session', {
          username: ctx.input.username,
          password: ctx.input.password
        });
        if (typeof response.data?.id !== 'string' || response.data.id.length === 0) {
          throw createApiServiceError('Metabase returned an invalid session response.', {
            reason: 'metabase_session_invalid'
          });
        }
        return {
          output: {
            token: response.data.id,
            instanceUrl,
            authMethod: 'session' as const
          }
        };
      } catch (error) {
        throw buildApiServiceError(error, {
          providerLabel: 'Metabase',
          operation: 'create session',
          reason: 'metabase_login_failed'
        });
      }
    },
    getProfile: async (ctx: { output: AuthOutput }) => await getProfile(ctx.output)
  });
