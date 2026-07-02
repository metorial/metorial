import { createHash, randomBytes } from 'node:crypto';
import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { normalizeSalesforceConfig, type SalesforceConfig } from './config';
import { salesforceOAuthError, salesforceServiceError } from './lib/errors';

let generateCodeVerifier = () => randomBytes(32).toString('base64url');

let generateCodeChallenge = (codeVerifier: string) =>
  createHash('sha256').update(codeVerifier).digest('base64url');

let normalizeSalesforceRedirectUri = (redirectUri: string) => {
  let url = new URL(redirectUri);
  if (url.protocol === 'http:' && url.hostname === '127.0.0.1') {
    url.hostname = 'localhost';
  }

  return url.toString();
};

export let resolveSalesforceOAuthConfig = (config: Record<string, any>): SalesforceConfig =>
  normalizeSalesforceConfig(config);

export let resolveSalesforceOAuthBaseUrl = (config: Record<string, any>) => {
  let oauthConfig = resolveSalesforceOAuthConfig(config);

  if (oauthConfig.environment === 'sandbox') {
    return 'https://test.salesforce.com';
  }

  if (oauthConfig.environment === 'custom') {
    return `https://${oauthConfig.customDomain}`;
  }

  return 'https://login.salesforce.com';
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      instanceUrl: z.string(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://help.salesforce.com/s/articleView?id=platform.ev_relay_create_connected_app.htm&type=5'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://help.salesforce.com/s/articleView?id=xcloud.remoteaccess_oauth_tokens_scopes.htm&type=5'
      }
    ],

    scopes: [
      {
        title: 'API Access',
        description: 'Access to REST API, Bulk API, and other data APIs',
        scope: 'api'
      },
      {
        title: 'Refresh Token',
        description: 'Allows obtaining a refresh token for persistent access',
        scope: 'refresh_token'
      },
      {
        title: 'OpenID',
        description: 'OpenID Connect identifier for user profile information',
        scope: 'openid'
      },
      {
        title: 'Profile',
        description: 'Access to user profile information',
        scope: 'profile'
      }
    ],

    inputSchema: z.object({}),

    getAuthorizationUrl: async ctx => {
      let baseUrl = resolveSalesforceOAuthBaseUrl(ctx.config ?? {});
      let redirectUri = normalizeSalesforceRedirectUri(ctx.redirectUri);
      let codeVerifier = generateCodeVerifier();
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' '),
        code_challenge: generateCodeChallenge(codeVerifier),
        code_challenge_method: 'S256'
      });

      return {
        url: `${baseUrl}/services/oauth2/authorize?${params.toString()}`,
        callbackState: { codeVerifier }
      };
    },

    handleCallback: async ctx => {
      let baseUrl = resolveSalesforceOAuthBaseUrl(ctx.config ?? {});
      let http = createAxios({ baseURL: baseUrl });
      let redirectUri = normalizeSalesforceRedirectUri(ctx.redirectUri);
      let codeVerifier = ctx.callbackState.codeVerifier as string | undefined;

      if (!codeVerifier) {
        throw salesforceServiceError(
          'Missing Salesforce PKCE code verifier for OAuth callback'
        );
      }

      let response: any;
      try {
        response = await http.post(
          '/services/oauth2/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: ctx.code,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier
          }).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );
      } catch (error) {
        throw salesforceOAuthError('authorization code exchange', error);
      }

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          instanceUrl: data.instance_url,
          expiresAt: data.issued_at
            ? new Date(Number.parseInt(data.issued_at, 10) + 7200 * 1000).toISOString()
            : undefined
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw salesforceServiceError(
          'No Salesforce refresh token available. Re-authorize with the refresh_token scope.'
        );
      }

      let baseUrl = resolveSalesforceOAuthBaseUrl(ctx.config ?? {});
      let http = createAxios({ baseURL: baseUrl });

      let response: any;
      try {
        response = await http.post(
          '/services/oauth2/token',
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret
          }).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );
      } catch (error) {
        throw salesforceOAuthError('token refresh', error);
      }

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          instanceUrl: data.instance_url || ctx.output.instanceUrl,
          expiresAt: data.issued_at
            ? new Date(Number.parseInt(data.issued_at, 10) + 7200 * 1000).toISOString()
            : undefined
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({ baseURL: ctx.output.instanceUrl });

      let response = await http.get('/services/oauth2/userinfo', {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });

      let data = response.data;

      return {
        profile: {
          id: data.user_id,
          email: data.email,
          name: data.name,
          imageUrl: data.picture,
          organizationId: data.organization_id,
          username: data.preferred_username
        }
      };
    }
  });
