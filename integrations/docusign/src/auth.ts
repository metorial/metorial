import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { docusignApiError, docusignServiceError } from './lib/errors';

let getAuthBaseUrl = (environment: string) =>
  environment === 'production'
    ? 'https://account.docusign.com'
    : 'https://account-d.docusign.com';

let scopes = [
  {
    title: 'Signature',
    description:
      'Access to the eSignature REST API for sending, signing, and managing envelopes',
    scope: 'signature'
  },
  {
    title: 'Extended',
    description: 'Extends refresh token lifetime for long-lived integrations',
    scope: 'extended'
  },
  {
    title: 'OpenID',
    description: 'OpenID Connect profile access for user information',
    scope: 'openid'
  },
  {
    title: 'Click Manage',
    description: 'Manage clickwrap agreements via the Click API',
    scope: 'click.manage'
  },
  {
    title: 'Click Send',
    description: 'Send clickwrap agreements via the Click API',
    scope: 'click.send'
  },
  {
    title: 'Organization Read',
    description: 'Read organization and admin data via the Admin API',
    scope: 'organization_read'
  },
  {
    title: 'Rooms Read',
    description: 'Read access to Rooms API for real estate transactions',
    scope: 'rooms_read'
  },
  {
    title: 'Rooms Write',
    description: 'Write access to Rooms API for real estate transactions',
    scope: 'rooms_write'
  },
  {
    title: 'Impersonation',
    description: 'Required for JWT Grant to act on behalf of a user',
    scope: 'impersonation'
  }
];

function createDocusignOauth(name: string, key: string, environment: 'demo' | 'production') {
  let authBaseUrl = getAuthBaseUrl(environment);

  return {
    type: 'auth.oauth' as const,
    name,
    key,
    docs: [
      {
        type: 'docs.auth.oauth' as const,
        name: 'OAuth documentation',
        url: 'https://developers.docusign.com/platform/auth/authcode/'
      },
      {
        type: 'docs.auth.oauth_scopes' as const,
        name: 'OAuth scopes',
        url: 'https://developers.docusign.com/platform/auth/reference/scopes/'
      }
    ],
    scopes,

    getAuthorizationUrl: async (ctx: any) => {
      let params = new URLSearchParams({
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });
      return { url: `${authBaseUrl}/oauth/auth?${params.toString()}` };
    },

    handleCallback: async (ctx: any) => {
      let axiosInstance = createAxios({ baseURL: authBaseUrl });
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      try {
        let tokenResponse = await axiosInstance.post(
          '/oauth/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: ctx.code,
            redirect_uri: ctx.redirectUri
          }).toString(),
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );

        let tokenData = tokenResponse.data;
        let accessToken = tokenData.access_token;
        let refreshToken = tokenData.refresh_token;
        let expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

        let userInfoResponse = await axiosInstance.get('/oauth/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        let userInfo = userInfoResponse.data;
        let defaultAccount =
          userInfo.accounts?.find((a: any) => a.is_default) || userInfo.accounts?.[0];

        if (!defaultAccount) {
          throw docusignServiceError('No DocuSign account found for this user.');
        }

        return {
          output: {
            token: accessToken,
            refreshToken,
            expiresAt,
            baseUri: defaultAccount.base_uri,
            accountId: defaultAccount.account_id,
            environment
          }
        };
      } catch (error) {
        throw docusignApiError(error, 'OAuth callback');
      }
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw docusignServiceError('No DocuSign refresh token is available.');
      }
      let axiosInstance = createAxios({ baseURL: authBaseUrl });
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      try {
        let tokenResponse = await axiosInstance.post(
          '/oauth/token',
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken
          }).toString(),
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );

        let tokenData = tokenResponse.data;
        let expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

        return {
          output: {
            token: tokenData.access_token,
            refreshToken: tokenData.refresh_token || ctx.output.refreshToken,
            expiresAt,
            baseUri: ctx.output.baseUri,
            accountId: ctx.output.accountId,
            environment
          }
        };
      } catch (error) {
        throw docusignApiError(error, 'OAuth refresh');
      }
    },

    getProfile: async (ctx: any) => {
      let axiosInstance = createAxios({ baseURL: authBaseUrl });
      try {
        let userInfoResponse = await axiosInstance.get('/oauth/userinfo', {
          headers: { Authorization: `Bearer ${ctx.output.token}` }
        });
        let userInfo = userInfoResponse.data;
        return {
          profile: {
            id: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name,
            accountId: ctx.output.accountId,
            accountName: userInfo.accounts?.find(
              (a: any) => a.account_id === ctx.output.accountId
            )?.account_name
          }
        };
      } catch (error) {
        throw docusignApiError(error, 'profile request');
      }
    }
  };
}

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      baseUri: z.string().describe('Base URI for API calls, obtained from /oauth/userinfo'),
      accountId: z.string().describe('DocuSign account ID'),
      environment: z.enum(['demo', 'production'])
    })
  )
  .addOauth(createDocusignOauth('Demo', 'oauth_demo', 'demo'))
  .addOauth(createDocusignOauth('Production', 'oauth_production', 'production'));
