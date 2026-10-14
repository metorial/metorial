import {
  buildApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let getTokenUrl = (environment: string) =>
  environment === 'development'
    ? 'https://tokenapiuat.veo.co.uk/oauth2/token'
    : 'https://tokenapi.veo.co.uk/oauth2/token';

let credentialsSchema = z.object({
  username: z.string().describe('Your VEO email address'),
  password: z.string().describe('Your VEO password'),
  clientId: z.string().describe('Client ID provided by your VEO representative'),
  clientSecret: z.string().describe('Client secret provided by your VEO representative'),
  environment: z
    .enum(['production', 'development'])
    .default('production')
    .describe('VEO environment')
});

let requestToken = async (input: z.infer<typeof credentialsSchema>) => {
  let http = createAuthenticatedAxios({
    contentType: 'application/x-www-form-urlencoded',
    timeout: 30_000,
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'VEO',
        operation: 'authentication',
        reason: 'veo_auth_error'
      })
  });
  let params = new URLSearchParams({
    Username: input.username,
    Password: input.password,
    Grant_type: 'password',
    Client_id: input.clientId
  });
  let response = await http.post(getTokenUrl(input.environment), params.toString(), {
    auth: { username: input.clientId, password: input.clientSecret }
  });
  let token = normalizeOAuthTokenResponse(response.data, {
    providerLabel: 'VEO',
    required: true
  });
  return {
    token: token.token,
    expiresAt: token.expiresAt,
    environment: input.environment
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      environment: z.string(),
      expiresAt: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'VEO Credentials',
    key: 'veo_credentials',

    inputSchema: credentialsSchema,

    getOutput: async ctx => {
      return { output: await requestToken(ctx.input) };
    },
    handleTokenRefresh: async (ctx: { input: z.infer<typeof credentialsSchema> }) => ({
      output: await requestToken(ctx.input)
    })
  });
