import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { AhaClient } from './lib/client';

let subdomainInput = z
  .string()
  .optional()
  .describe(
    'Your Aha! account subdomain, such as company for company.aha.io. OAuth can discover it during sign-in; API-key connections must provide it.'
  );

let getProfile = async (ctx: {
  output: { token: string; subdomain?: string };
  input: { subdomain?: string };
  config?: Record<string, unknown>;
}) => {
  let subdomain = AhaClient.resolveSubdomain(
    ctx.output.subdomain ?? ctx.input.subdomain,
    ctx.config
  );
  let user = await new AhaClient(subdomain, ctx.output.token).getMe();
  return {
    profile: { id: user.id, email: user.email, name: user.name, imageUrl: user.avatar_url }
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      subdomain: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Aha! OAuth',
    key: 'oauth',
    scopes: [],
    inputSchema: z.object({ subdomain: subdomainInput }),
    getAuthorizationUrl: async ctx => {
      let host = ctx.input.subdomain
        ? `${AhaClient.resolveSubdomain(ctx.input.subdomain)}.aha.io`
        : 'secure.aha.io';
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state
      });
      return { url: `https://${host}/oauth/authorize?${params.toString()}`, input: ctx.input };
    },
    handleCallback: async ctx => {
      let subdomain = AhaClient.resolveSubdomain(
        ctx.callbackParams?.account_subdomain ?? ctx.input.subdomain,
        ctx.config
      );
      let client = createAuthenticatedAxios({
        baseURL: `https://${subdomain}.aha.io`,
        contentType: 'application/x-www-form-urlencoded',
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'Aha!',
            reason: 'aha_oauth_error',
            operation: 'OAuth token exchange'
          })
      });
      let response = await client.post(
        '/oauth/token',
        new URLSearchParams({
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: ctx.redirectUri
        }).toString()
      );
      let data = response.data as { access_token?: string; error?: string };
      if (!data.access_token) {
        throw createApiServiceError(
          `Aha! OAuth error: ${data.error || 'No access token received'}`
        );
      }
      return { output: { token: data.access_token, subdomain }, input: ctx.input };
    },
    getProfile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Aha! API key (Settings → Personal → Developer → Generate API key)'),
      subdomain: subdomainInput
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.token,
        subdomain: AhaClient.resolveSubdomain(ctx.input.subdomain, ctx.config)
      }
    }),
    getProfile
  });
