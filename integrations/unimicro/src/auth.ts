import { createAxios, normalizeOAuthTokenResponse, requestAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { configSchema } from './config';
import {
  discoverUnimicroEndpoints,
  extractJwtStringClaim,
  trimTrailingSlash,
  type UnimicroAuthOutput
} from './lib/client';
import { unimicroApiError, unimicroValidationError } from './lib/errors';

let authHttp = createAxios({
  headers: {
    Accept: 'application/json'
  }
});

let requestUnimicroAuth = <T>(operation: string, request: () => Promise<T>) =>
  requestAxios(operation, request as any, unimicroApiError) as Promise<T>;

let getGrantedScopes = (data: unknown, requestedScopes: string[]) => {
  if (typeof data === 'object' && data !== null && 'scope' in data) {
    let scope = (data as { scope?: unknown }).scope;
    if (typeof scope === 'string' && scope.trim()) {
      return scope.trim().split(/\s+/);
    }
  }

  return requestedScopes;
};

let formBody = (input: Record<string, string | undefined>) => {
  let body = new URLSearchParams();
  for (let [key, value] of Object.entries(input)) {
    if (value !== undefined) body.set(key, value);
  }
  return body.toString();
};

let resolveIdentityEndpoints = async (
  config: z.infer<typeof configSchema>,
  previousOutput?: Partial<UnimicroAuthOutput>
) => {
  let endpoints = await discoverUnimicroEndpoints(config);
  let identityUrl = endpoints.identityUrl ?? previousOutput?.identityUrl;

  if (!identityUrl) {
    throw unimicroValidationError(
      'UniMicro identity URL is required. Set environment to test/unimicro or provide customIdentityUrl.'
    );
  }

  return {
    ...endpoints,
    identityUrl
  };
};

let buildTokenOutput = async (params: {
  data: unknown;
  requestedScopes: string[];
  config: z.infer<typeof configSchema>;
  previousRefreshToken?: string;
  previousOutput?: Partial<UnimicroAuthOutput>;
  endpoints?: Awaited<ReturnType<typeof resolveIdentityEndpoints>>;
  operation: string;
}): Promise<UnimicroAuthOutput> => {
  let token = normalizeOAuthTokenResponse(params.data, {
    providerLabel: 'UniMicro',
    operation: params.operation,
    previousRefreshToken: params.previousRefreshToken,
    refreshTokenFallbackMode: params.previousRefreshToken ? 'falsy' : undefined,
    accessTokenMessage: 'UniMicro OAuth token response did not include an access token.'
  });
  let endpoints = params.endpoints ?? (await discoverUnimicroEndpoints(params.config));
  let appFrameworkClaim = extractJwtStringClaim(token.token, 'AppFramework');

  return {
    token: token.token,
    refreshToken: token.refreshToken,
    expiresAt: token.expiresAt,
    tokenType: 'Bearer',
    grantedScopes: getGrantedScopes(params.data, params.requestedScopes),
    environment: params.config.environment,
    appFrameworkUrl:
      appFrameworkClaim ?? endpoints.appFrameworkUrl ?? params.previousOutput?.appFrameworkUrl,
    identityUrl: endpoints.identityUrl ?? params.previousOutput?.identityUrl,
    filesUrl: endpoints.filesUrl ?? params.previousOutput?.filesUrl
  };
};

let getProfileFromUserInfo = async (output: UnimicroAuthOutput) => {
  if (!output.identityUrl) {
    return {
      profile: {
        id: output.environment,
        name: 'UniMicro',
        environment: output.environment
      }
    };
  }

  let response = await requestUnimicroAuth('profile lookup', () =>
    authHttp.get(`${trimTrailingSlash(output.identityUrl!)}/connect/userinfo`, {
      headers: {
        Authorization: `Bearer ${output.token}`
      }
    })
  );
  let data = response.data;
  let record =
    typeof data === 'object' && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  let id =
    typeof record.sub === 'string'
      ? record.sub
      : typeof record.email === 'string'
        ? record.email
        : output.environment;
  let name =
    typeof record.name === 'string'
      ? record.name
      : typeof record.preferred_username === 'string'
        ? record.preferred_username
        : 'UniMicro';

  return {
    profile: {
      id,
      name,
      email: typeof record.email === 'string' ? record.email : undefined,
      environment: output.environment,
      appFrameworkUrl: output.appFrameworkUrl,
      filesUrl: output.filesUrl
    }
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('UniMicro OAuth access token.'),
      refreshToken: z.string().optional().describe('UniMicro OAuth refresh token.'),
      expiresAt: z.string().optional().describe('Access token expiration timestamp.'),
      tokenType: z.string().optional().describe('OAuth token type.'),
      grantedScopes: z
        .array(z.string())
        .optional()
        .describe('Scopes returned by UniMicro or requested during authorization.'),
      environment: z
        .enum(['test', 'unimicro', 'custom'])
        .describe('UniMicro platform environment used for this connection.'),
      appFrameworkUrl: z.string().optional().describe('Resolved UniMicro AppFramework URL.'),
      identityUrl: z.string().optional().describe('Resolved UniMicro identity URL.'),
      filesUrl: z.string().optional().describe('Resolved UniMicro file server URL.')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'UniMicro OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'UniMicro OAuth authentication',
        url: 'https://developer.unimicro.no/guide/authentication/auth-code'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'UniMicro environments and scopes',
        url: 'https://developer.unimicro.no/guide/intro/environments'
      }
    ],
    scopes: [
      {
        title: 'OpenID',
        description: 'Access OpenID identity claims.',
        scope: 'openid'
      },
      {
        title: 'Profile',
        description: 'Access profile claims for the authenticated user.',
        scope: 'profile'
      },
      {
        title: 'Offline Access',
        description: 'Issue refresh tokens so Slates can refresh UniMicro access tokens.',
        scope: 'offline_access'
      },
      {
        title: 'AppFramework',
        description: 'Access UniMicro AppFramework business APIs.',
        scope: 'AppFramework'
      },
      {
        title: 'Sales Invoice',
        description: 'Read customer invoice data.',
        scope: 'Sales.Invoice'
      },
      {
        title: 'Accounting Reporting',
        description: 'Read reports such as profit and loss, balance, and trial balance.',
        scope: 'Accounting.Reporting'
      },
      {
        title: 'Accounting Journal',
        description: 'Read journal entry and account data.',
        scope: 'Accounting.Journal'
      },
      {
        title: 'Read Only',
        description: 'Read-only API access where enabled by the UniMicro application.',
        scope: 'READ_ONLY',
        defaultChecked: false
      }
    ],

    getAuthorizationUrl: async ctx => {
      let parsedConfig = configSchema.parse(ctx.config);
      let endpoints = await resolveIdentityEndpoints(parsedConfig);
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `${trimTrailingSlash(endpoints.identityUrl)}/connect/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let parsedConfig = configSchema.parse(ctx.config);
      let endpoints = await resolveIdentityEndpoints(parsedConfig);
      let response = await requestUnimicroAuth('OAuth token exchange', () =>
        authHttp.post(
          `${trimTrailingSlash(endpoints.identityUrl)}/connect/token`,
          formBody({
            grant_type: 'authorization_code',
            code: ctx.code,
            redirect_uri: ctx.redirectUri,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        )
      );

      return {
        output: await buildTokenOutput({
          data: response.data,
          requestedScopes: ctx.scopes,
          config: parsedConfig,
          endpoints,
          operation: 'token exchange'
        })
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw unimicroValidationError('No UniMicro refresh token is available.');
      }

      let parsedConfig = configSchema.parse(ctx.config);
      let endpoints = await resolveIdentityEndpoints(parsedConfig, ctx.output);
      let response = await requestUnimicroAuth('OAuth token refresh', () =>
        authHttp.post(
          `${trimTrailingSlash(endpoints.identityUrl)}/connect/token`,
          formBody({
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        )
      );

      return {
        output: await buildTokenOutput({
          data: response.data,
          requestedScopes: ctx.output.grantedScopes ?? [],
          config: parsedConfig,
          previousRefreshToken: ctx.output.refreshToken,
          previousOutput: ctx.output,
          endpoints,
          operation: 'token refresh'
        })
      };
    },

    getProfile: async (ctx: any) => getProfileFromUserInfo(ctx.output)
  });
