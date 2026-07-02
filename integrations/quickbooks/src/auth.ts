import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { quickBooksApiError, quickBooksServiceError } from './lib/errors';

let oauthAxios = createAxios({
  baseURL: 'https://oauth.platform.intuit.com'
});

let userInfoAxios = createAxios({
  baseURL: 'https://accounts.platform.intuit.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      realmId: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'QuickBooks OAuth',
    key: 'quickbooks_oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.intuit.com/app/developer/qbo/docs/learn/scopes'
      }
    ],

    scopes: [
      {
        title: 'Accounting',
        description:
          'Access to accounting data including invoices, customers, vendors, accounts, and more',
        scope: 'com.intuit.quickbooks.accounting'
      },
      {
        title: 'OpenID',
        description: 'OpenID Connect authentication',
        scope: 'openid'
      },
      {
        title: 'Profile',
        description: 'Access to user profile information',
        scope: 'profile'
      },
      {
        title: 'Email',
        description: 'Access to user email address',
        scope: 'email'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });

      return {
        url: `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      try {
        let response = await oauthAxios.post(
          '/oauth2/v1/tokens/bearer',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: ctx.code,
            redirect_uri: ctx.redirectUri
          }).toString(),
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json'
            }
          }
        );

        let data = response.data;
        if (!data?.access_token) {
          throw quickBooksServiceError(
            'QuickBooks OAuth token exchange did not return an access token.'
          );
        }

        let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

        return {
          output: {
            token: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt,
            realmId: ctx.callbackParams?.realmId
          }
        };
      } catch (error) {
        throw quickBooksApiError(error, 'OAuth token exchange');
      }
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw quickBooksServiceError('QuickBooks OAuth refresh requires a refresh token.');
      }

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      try {
        let response = await oauthAxios.post(
          '/oauth2/v1/tokens/bearer',
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken
          }).toString(),
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json'
            }
          }
        );

        let data = response.data;
        if (!data?.access_token) {
          throw quickBooksServiceError(
            'QuickBooks OAuth refresh did not return an access token.'
          );
        }

        let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

        return {
          output: {
            token: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt,
            realmId: ctx.output.realmId
          }
        };
      } catch (error) {
        throw quickBooksApiError(error, 'OAuth token refresh');
      }
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string; realmId?: string };
      input: {};
      scopes: string[];
    }) => {
      try {
        let response = await userInfoAxios.get('/v1/openid_connect/userinfo', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`,
            Accept: 'application/json'
          }
        });

        let data = response.data;
        if (!data?.sub) {
          throw quickBooksServiceError(
            'QuickBooks profile response did not include a user ID.'
          );
        }

        return {
          profile: {
            id: ctx.output.realmId ? `${data.sub}:${ctx.output.realmId}` : data.sub,
            email: data.email,
            name: [data.givenName, data.familyName].filter(Boolean).join(' ') || data.email
          }
        };
      } catch (error) {
        throw quickBooksApiError(error, 'profile lookup');
      }
    }
  });
