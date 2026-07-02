import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let MOCK_OAUTH_BASE_URL = 'https://mock-oauth.metorial.net';
let MOCK_CLIENT_SECRET = 'mock-secret';

let DEFAULT_SCOPES = [
  { title: 'OpenID', description: 'OpenID Connect sign-in.', scope: 'openid' },
  { title: 'Profile', description: 'Basic profile information.', scope: 'profile' },
  { title: 'Email', description: 'Email address.', scope: 'email' }
];

let mockAxios = createAxios({
  baseURL: MOCK_OAUTH_BASE_URL
});

let buildMockOauthMethod = (params: {
  key: string;
  name: string;
  description: string;
  mockClientId: string;
}) => {
  let { key, name, description, mockClientId } = params;

  return {
    type: 'auth.oauth' as const,
    name,
    key,

    scopes: DEFAULT_SCOPES.map(s => ({
      ...s,
      description: `[${description}] ${s.description ?? ''}`.trim()
    })),

    getAuthorizationUrl: async (ctx: {
      redirectUri: string;
      state: string;
      scopes: string[];
    }) => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: mockClientId,
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.length > 0 ? ctx.scopes.join(' ') : 'openid profile email',
        state: ctx.state
      });

      return {
        url: `${MOCK_OAUTH_BASE_URL}/authorize?${params.toString()}`
      };
    },

    handleCallback: async (ctx: { code: string; redirectUri: string }) => {
      let response = await mockAxios.post(
        '/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: mockClientId,
          client_secret: MOCK_CLIENT_SECRET
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;
      let grantedScopes =
        typeof data.scope === 'string' ? data.scope.split(' ').filter(Boolean) : undefined;

      return {
        output: {
          token: data.access_token as string,
          refreshToken: data.refresh_token as string | undefined,
          expiresAt,
          idToken: data.id_token as string | undefined
        },
        scopes: grantedScopes
      };
    },

    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string; idToken?: string };
    }) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let response = await mockAxios.post(
        '/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: mockClientId,
          client_secret: MOCK_CLIENT_SECRET
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token as string,
          refreshToken: (data.refresh_token ?? ctx.output.refreshToken) as string | undefined,
          expiresAt,
          idToken: (data.id_token ?? ctx.output.idToken) as string | undefined
        }
      };
    },

    getProfile: async (ctx: { output: { token: string } }) => {
      let response = await mockAxios.get('/userinfo', {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });

      let data = response.data;

      return {
        profile: {
          id: data.sub,
          email: data.email,
          name: data.name
        }
      };
    }
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      idToken: z.string().optional()
    })
  )
  .addOauth(
    buildMockOauthMethod({
      key: 'success',
      name: 'Success',
      description: 'Happy-path OAuth flow against mock-oauth — issues working tokens.',
      mockClientId: 'demo-client'
    })
  )
  .addOauth(
    buildMockOauthMethod({
      key: 'error_authorize',
      name: 'Error: /authorize 400',
      description:
        'mock-oauth renders a 400 page on /authorize before consent is shown (client_id=error:authorize).',
      mockClientId: 'error:authorize'
    })
  )
  .addOauth(
    buildMockOauthMethod({
      key: 'error_authorize_redirect',
      name: 'Error: access_denied redirect',
      description:
        'Consent immediately redirects back with ?error=access_denied (client_id=error:authorize_redirect).',
      mockClientId: 'error:authorize_redirect'
    })
  )
  .addOauth(
    buildMockOauthMethod({
      key: 'error_authorize_redirect_server_error',
      name: 'Error: server_error redirect',
      description:
        'Consent redirects back with ?error=server_error (client_id=error:authorize_redirect:server_error).',
      mockClientId: 'error:authorize_redirect:server_error'
    })
  )
  .addOauth(
    buildMockOauthMethod({
      key: 'error_token_exchange',
      name: 'Error: token invalid_grant',
      description:
        '/token returns invalid_grant when exchanging the authorization code (client_id=error:token_exchange).',
      mockClientId: 'error:token_exchange'
    })
  )
  .addOauth(
    buildMockOauthMethod({
      key: 'error_token_exchange_invalid_client',
      name: 'Error: token invalid_client',
      description:
        '/token returns invalid_client (HTTP 401) on code exchange (client_id=error:token_exchange:invalid_client).',
      mockClientId: 'error:token_exchange:invalid_client'
    })
  )
  .addOauth(
    buildMockOauthMethod({
      key: 'error_refresh',
      name: 'Error: refresh invalid_grant',
      description:
        'Initial token exchange succeeds, but refresh_token grant returns invalid_grant (client_id=error:refresh).',
      mockClientId: 'error:refresh'
    })
  )
  .addOauth(
    buildMockOauthMethod({
      key: 'error_client_credentials',
      name: 'Error: client_credentials invalid_client',
      description:
        'client_credentials grant returns invalid_client. Not exercised by the auth-code flow itself but issued for clients that also run service-to-service grants (client_id=error:client_credentials).',
      mockClientId: 'error:client_credentials'
    })
  )
  .addOauth(
    buildMockOauthMethod({
      key: 'error_userinfo',
      name: 'Error: userinfo 401',
      description:
        'Tokens are issued successfully, but /userinfo returns 401 invalid_token (client_id=error:userinfo).',
      mockClientId: 'error:userinfo'
    })
  )
  .addOauth(
    buildMockOauthMethod({
      key: 'error_introspect',
      name: 'Error: introspect 400',
      description:
        '/introspect returns an error body. Only exercised by clients that actively introspect tokens (client_id=error:introspect).',
      mockClientId: 'error:introspect'
    })
  )
  .addOauth(
    buildMockOauthMethod({
      key: 'error_id_token',
      name: 'Error: corrupted id_token',
      description:
        'Tokens are issued but the id_token has a corrupted signature. Only fails for clients that verify the id_token (client_id=error:id_token).',
      mockClientId: 'error:id_token'
    })
  )
  .addOauth(
    buildMockOauthMethod({
      key: 'error_slow',
      name: 'Error: slow /token (2s)',
      description:
        '/token sleeps for 2000ms before responding. Useful for testing timeouts (client_id=error:slow:2000).',
      mockClientId: 'error:slow:2000'
    })
  )
  .addOauth(
    buildMockOauthMethod({
      key: 'error_all',
      name: 'Error: fail every stage',
      description:
        'Fails at every OAuth stage that supports failure injection (client_id=error:all). Does not imply id_token corruption or slow responses.',
      mockClientId: 'error:all'
    })
  );
