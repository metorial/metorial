import { createAxios, normalizeOAuthTokenResponse, requestAxiosData, SlateAuth } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from './lib/client';
import {
  apiError,
  domainName,
  integer,
  invalid,
  noControls,
  record,
  text
} from './lib/contracts';

type OAuthState = { token: string; refreshToken?: string; expiresAt?: string; domain: string };
type RefreshContext = {
  output: OAuthState;
  input: { domain: string };
  clientId: string;
  clientSecret: string;
};
const scopes = [
  {
    title: 'File System',
    description: 'Manage files, folders, comments, trash and workflows',
    scope: 'Egnyte.filesystem'
  },
  { title: 'Links', description: 'Manage sharing links', scope: 'Egnyte.link' },
  { title: 'Users', description: 'Read and manage users', scope: 'Egnyte.user' },
  { title: 'Groups', description: 'Read and manage custom groups', scope: 'Egnyte.group' },
  {
    title: 'Permissions',
    description: 'Read and update folder permissions',
    scope: 'Egnyte.permission'
  },
  { title: 'Audit', description: 'Generate and read audit reports', scope: 'Egnyte.audit' }
];
const requestedScopes = (selected: string[]) =>
  (selected.length ? selected : scopes.map(s => s.scope)).join(' ');
const exchange = async (
  domain: string,
  params: Record<string, string>,
  previousRefreshToken?: string
) => {
  const http = createAxios({
    baseURL: `https://${domainName(domain)}.egnyte.com`,
    timeout: 30000,
    maxRedirects: 0
  });
  const data = record(
    await requestAxiosData(
      'Egnyte OAuth',
      () =>
        http.post('/puboauth/token', new URLSearchParams(params).toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }),
      apiError
    )
  );
  noControls(text(data.access_token, 'access token'));
  if (data.refresh_token !== undefined) noControls(text(data.refresh_token, 'refresh token'));
  integer(data.expires_in, 1);
  if (data.token_type !== undefined && String(data.token_type).toLowerCase() !== 'bearer')
    throw invalid('Egnyte returned an unsupported token type.');
  return normalizeOAuthTokenResponse(data, {
    providerLabel: 'Egnyte',
    required: true,
    expiresInType: 'number',
    previousRefreshToken
  });
};
export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      domain: z.string().describe('Egnyte domain name')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes,
    inputSchema: z.object({
      domain: z
        .string()
        .describe('Domain name only, for example mycompany for mycompany.egnyte.com')
    }),
    getAuthorizationUrl: async ctx => {
      const domain = domainName(ctx.input.domain);
      const params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: requestedScopes(ctx.scopes)
      });
      return {
        url: `https://${domain}.egnyte.com/puboauth/token?${params}`,
        input: { domain }
      };
    },
    handleCallback: async ctx => {
      const domain = domainName(ctx.input.domain);
      const output = await exchange(domain, {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri,
        code: ctx.code,
        grant_type: 'authorization_code',
        scope: requestedScopes(ctx.scopes)
      });
      return { output: { ...output, domain }, input: { domain } };
    },
    handleTokenRefresh: async (ctx: RefreshContext) => {
      const domain = domainName(ctx.output.domain || ctx.input.domain);
      const refreshToken = ctx.output.refreshToken;
      if (!refreshToken)
        throw invalid('This connection has no refresh token. Reconnect to Egnyte.');
      const output = await exchange(
        domain,
        {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: text(refreshToken, 'refresh token')
        },
        refreshToken
      );
      return { output: { ...output, domain }, input: { domain } };
    },
    getProfile: async (ctx: { output: OAuthState }) => {
      const data = await new EgnyteClient(ctx.output).getCurrentUser();
      return {
        profile: {
          id: String(data.id),
          name:
            [data.first_name, data.last_name].filter(v => typeof v === 'string').join(' ') ||
            text(data.username),
          ...(typeof data.email === 'string' ? { email: data.email } : {})
        }
      };
    }
  });
