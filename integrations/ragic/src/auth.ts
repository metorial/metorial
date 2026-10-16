import { createApiServiceError, createAxios, isApiErrorRecord, SlateAuth } from 'slates';
import { z } from 'zod';
import { normalizeServerDomain, ragicApiError } from './lib/client';

let serverDomain = z
  .string()
  .describe(
    'Ragic server domain from your account URL, for example www.ragic.com or na3.ragic.com.'
  );

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authMode: z.enum(['api_key', 'session']).optional(),
      serverDomain: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Ragic API key. Generate it from Personal Settings > Profile in your Ragic account.'
        ),
      serverDomain: serverDomain.optional()
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) throw createApiServiceError('Enter your Ragic API key.');
      return {
        output: {
          token: ctx.input.apiKey,
          authMode: 'api_key' as const,
          serverDomain: normalizeServerDomain(ctx.input.serverDomain ?? 'www.ragic.com')
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Email & Password',
    key: 'email_password',
    inputSchema: z.object({
      serverDomain,
      email: z.string().describe('Your Ragic account email address'),
      password: z.string().describe('Your Ragic account password')
    }),
    getOutput: async ctx => {
      let domain = normalizeServerDomain(ctx.input.serverDomain ?? 'www.ragic.com');
      if (!ctx.input.email.trim() || !ctx.input.password)
        throw createApiServiceError('Enter your Ragic email and password.');
      let ax = createAxios({
        baseURL: `https://${domain}`,
        timeout: 30000,
        validateStatus: () => true
      });
      let response: { status: number; data: unknown };
      try {
        response = await ax.get('/AUTH', {
          params: {
            u: ctx.input.email,
            p: ctx.input.password,
            login_type: 'sessionId',
            json: '1',
            api: ''
          }
        });
      } catch (error) {
        throw ragicApiError(error, 'authentication', [ctx.input.email, ctx.input.password]);
      }
      if (
        response.status < 200 ||
        response.status >= 300 ||
        (isApiErrorRecord(response.data) && response.data.status === 'ERROR')
      ) {
        throw ragicApiError({ response }, 'authentication', [
          ctx.input.email,
          ctx.input.password
        ]);
      }
      let sessionId = isApiErrorRecord(response.data) ? response.data.sid : undefined;
      if (typeof sessionId !== 'string' || !sessionId.trim() || sessionId === '-1')
        throw createApiServiceError(
          'Ragic could not authenticate this account. Check your email, password, and server domain.',
          { reason: 'invalid_authentication_response' }
        );
      return {
        output: { token: sessionId, authMode: 'session' as const, serverDomain: domain }
      };
    }
  });
