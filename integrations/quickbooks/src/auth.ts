import {
  createAxios,
  getOAuthExpiresAtFromExpiresIn,
  normalizeOAuthTokenResponse,
  SlateAuth
} from '@slates/provider';
import { z } from 'zod';
import { quickBooksApiError, quickBooksServiceError } from './lib/errors';

let oauthAxios = createAxios({
  baseURL: 'https://oauth.platform.intuit.com'
});

type QuickBooksEnvironment = 'sandbox' | 'production';

let getUserInfoBaseUrl = (environment?: QuickBooksEnvironment) =>
  environment === 'sandbox'
    ? 'https://sandbox-accounts.platform.intuit.com'
    : 'https://accounts.platform.intuit.com';

let docs = [
  {
    type: 'docs.auth.oauth' as const,
    name: 'OAuth documentation',
    url: 'https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0'
  },
  {
    type: 'docs.auth.oauth_scopes' as const,
    name: 'OAuth scopes',
    url: 'https://developer.intuit.com/app/developer/qbo/docs/learn/scopes'
  }
];

let scopes = [
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
];

let createQuickBooksOauth = (
  name: string,
  key: string,
  environment?: QuickBooksEnvironment
) => ({
  type: 'auth.oauth' as const,
  name,
  key,
  docs,
  scopes,

  getAuthorizationUrl: async (ctx: any) => {
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

  handleCallback: async (ctx: any) => {
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
      let token = normalizeOAuthTokenResponse(data, {
        providerLabel: 'QuickBooks',
        operation: 'token exchange',
        accessTokenMessage: 'QuickBooks OAuth token exchange did not return an access token.'
      });
      let refreshTokenExpiresAt = getOAuthExpiresAtFromExpiresIn(
        data?.x_refresh_token_expires_in,
        { providerLabel: 'QuickBooks', operation: 'token exchange' }
      );

      return {
        output: {
          token: token.token,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          refreshTokenExpiresAt,
          realmId: ctx.callbackParams?.realmId,
          // Only dedicated environment-pinned auth methods persist the
          // environment. The generic method leaves it unset so tools keep
          // following the live config value.
          ...(environment ? { environment } : {})
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

    // Preserve an environment that is already persisted (or pinned by a
    // dedicated auth method), but never introduce one from live config.
    let resolvedEnvironment = environment ?? ctx.output.environment;
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
      let token = normalizeOAuthTokenResponse(data, {
        providerLabel: 'QuickBooks',
        operation: 'token refresh',
        previousRefreshToken: ctx.output.refreshToken,
        accessTokenMessage: 'QuickBooks OAuth refresh did not return an access token.'
      });
      let refreshTokenExpiresAt =
        getOAuthExpiresAtFromExpiresIn(data?.x_refresh_token_expires_in, {
          providerLabel: 'QuickBooks',
          operation: 'token refresh'
        }) ?? ctx.output.refreshTokenExpiresAt;

      return {
        output: {
          token: token.token,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          refreshTokenExpiresAt,
          realmId: ctx.output.realmId,
          ...(resolvedEnvironment ? { environment: resolvedEnvironment } : {})
        }
      };
    } catch (error) {
      throw quickBooksApiError(error, 'OAuth token refresh');
    }
  },

  getProfile: async (ctx: {
    output: {
      token: string;
      refreshToken?: string;
      expiresAt?: string;
      refreshTokenExpiresAt?: string;
      realmId?: string;
      environment?: QuickBooksEnvironment;
    };
    input: {};
    scopes: string[];
    config?: {
      environment?: QuickBooksEnvironment;
    };
  }) => {
    try {
      let resolvedEnvironment =
        environment ?? ctx.output.environment ?? ctx.config?.environment;
      let userInfoAxios = createAxios({
        baseURL: getUserInfoBaseUrl(resolvedEnvironment)
      });
      let response = await userInfoAxios.get('/v1/openid_connect/userinfo', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          Accept: 'application/json'
        }
      });

      let data = response.data;
      if (!data?.sub) {
        throw quickBooksServiceError('QuickBooks profile response did not include a user ID.');
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

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      refreshTokenExpiresAt: z.string().optional(),
      realmId: z.string().optional(),
      environment: z.enum(['sandbox', 'production']).optional()
    })
  )
  .addOauth(createQuickBooksOauth('QuickBooks OAuth', 'quickbooks_oauth'))
  .addOauth(createQuickBooksOauth('Production', 'quickbooks_oauth_production', 'production'))
  .addOauth(createQuickBooksOauth('Sandbox', 'quickbooks_oauth_sandbox', 'sandbox'));
