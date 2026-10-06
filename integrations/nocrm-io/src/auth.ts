import { buildApiServiceError, createAuthenticatedAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let subdomainSchema = z
  .string()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*$/)
  .describe('Your noCRM.io account subdomain (e.g. mycompany from mycompany.nocrm.io)');

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('API key or user token for authenticating with noCRM.io'),
      tokenType: z.enum(['api_key', 'user_token']).optional(),
      subdomain: subdomainSchema.optional(),
      userId: z.number().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      subdomain: subdomainSchema,
      apiKey: z
        .string()
        .describe('Admin API key generated from Admin Panel > Integrations > API > API Keys')
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.apiKey,
        tokenType: 'api_key' as const,
        subdomain: ctx.input.subdomain
      }
    })
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Email & Password',
    key: 'email_password',
    inputSchema: z.object({
      subdomain: subdomainSchema,
      email: z.string().describe('Your noCRM.io account email'),
      password: z.string().describe('Your noCRM.io account password')
    }),
    getOutput: async ctx => {
      let ax = createAuthenticatedAxios({
        baseURL: `https://${ctx.input.subdomain}.nocrm.io/api/v2`,
        errorAdapter: error =>
          buildApiServiceError(error, { providerLabel: 'noCRM.io', reason: 'nocrm_api_error' })
      });
      let response = await ax.get('/auth/login', {
        auth: { username: ctx.input.email, password: ctx.input.password }
      });
      return {
        output: {
          token: response.data.token,
          tokenType: 'user_token' as const,
          subdomain: response.data.slug ?? ctx.input.subdomain,
          userId: response.data.user_id
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; subdomain?: string; userId?: number };
      input: { subdomain: string; email: string; password: string };
    }) => {
      let ax = createAuthenticatedAxios({
        baseURL: `https://${ctx.output.subdomain ?? ctx.input.subdomain}.nocrm.io/api/v2`,
        authHeader: { name: 'X-USER-TOKEN', value: ctx.output.token },
        errorAdapter: error =>
          buildApiServiceError(error, { providerLabel: 'noCRM.io', reason: 'nocrm_api_error' })
      });
      let response = await ax.get(
        `/users/${encodeURIComponent(String(ctx.output.userId ?? ctx.input.email))}`
      );
      return {
        profile: {
          id: String(response.data.id),
          email: response.data.email,
          name: `${response.data.firstname} ${response.data.lastname}`
        }
      };
    }
  });
