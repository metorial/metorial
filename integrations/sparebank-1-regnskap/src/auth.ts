import {
  createAxios,
  normalizeOAuthTokenResponse,
  requestAxiosData,
  SlateAuth,
  type SlateAuthDocsReference
} from 'slates';
import { z } from 'zod';
import {
  discoverEnvironmentEndpoints,
  environmentFromKey,
  type SpareBankEnvironmentKey,
  spareBankEnvironmentKeySchema
} from './lib/environments';
import { spareBankRegnskapApiError, spareBankRegnskapValidationError } from './lib/errors';

let identityScopes = ['openid', 'profile', 'email'] as const;
let requiredApiScopes = ['offline_access', 'AppFramework', 'READ_ONLY'] as const;

let oauthScopes = [
  {
    title: 'Offline Access',
    description: 'Allows Slates to refresh access tokens.',
    scope: 'offline_access'
  },
  {
    title: 'AppFramework',
    description: 'Provides access to the selected Unimicro AppFramework environment.',
    scope: 'AppFramework'
  },
  {
    title: 'Read Only',
    description: 'Read-only access to Unimicro Platform resources.',
    scope: 'READ_ONLY'
  },
  {
    title: 'Accounting Reporting',
    description: 'Read accounting reports and ledger-related data.',
    scope: 'Accounting.Reporting'
  },
  {
    title: 'Sales Reporting',
    description: 'Read sales and invoicing reporting data.',
    scope: 'Sales.Reporting'
  },
  {
    title: 'Sales Invoice',
    description: 'Read customer invoice data.',
    scope: 'Sales.Invoice'
  },
  {
    title: 'Approval Accounting',
    description: 'Read accounting approval and supplier invoice context.',
    scope: 'Approval.Accounting'
  }
];

let uniqueScopes = (scopes: readonly string[]) => [...new Set(scopes.filter(Boolean))];

let parseGrantedScopes = (scope: unknown, fallback: string[]) => {
  if (Array.isArray(scope)) {
    return uniqueScopes(scope.filter((item): item is string => typeof item === 'string'));
  }

  if (typeof scope === 'string') {
    return uniqueScopes(scope.split(/\s+/g));
  }

  return uniqueScopes(fallback);
};

let tokenResponseSchema = z.object({
  access_token: z.unknown().optional(),
  refresh_token: z.unknown().optional(),
  expires_in: z.unknown().optional(),
  token_type: z.unknown().optional(),
  scope: z.unknown().optional()
});

export let authOutputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  tokenType: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  environment: spareBankEnvironmentKeySchema,
  environmentName: z.string(),
  baseUrl: z.string(),
  appFrameworkUrl: z.string(),
  identityUrl: z.string(),
  filesUrl: z.string()
});

export type SpareBankRegnskapAuthOutput = z.infer<typeof authOutputSchema>;

let oauthInputSchema = z.object({
  environment: spareBankEnvironmentKeySchema
    .optional()
    .describe('SpareBank 1 Regnskap environment. Defaults to sb1.')
});

let selectedEnvironment = (environment?: SpareBankEnvironmentKey) => environment ?? 'sb1';

let normalizeToken = (
  data: unknown,
  options: {
    operation: string;
    requestedScopes: string[];
    previousRefreshToken?: string;
    environment: SpareBankEnvironmentKey;
    endpoints: {
      appFrameworkUrl: string;
      identityUrl: string;
      filesUrl: string;
    };
  }
): SpareBankRegnskapAuthOutput => {
  let parsedResult = tokenResponseSchema.safeParse(data);
  if (!parsedResult.success) {
    throw spareBankRegnskapValidationError(
      `SpareBank 1 Regnskap ${options.operation} response was not a valid OAuth token object.`
    );
  }

  let parsed = parsedResult.data;
  let normalized = normalizeOAuthTokenResponse(parsed, {
    providerLabel: 'SpareBank 1 Regnskap',
    operation: options.operation,
    previousRefreshToken: options.previousRefreshToken,
    refreshTokenFallbackMode: 'falsy'
  });
  let environment = environmentFromKey(options.environment);

  return {
    token: normalized.token,
    refreshToken: normalized.refreshToken,
    expiresAt: normalized.expiresAt,
    tokenType: typeof parsed.token_type === 'string' ? parsed.token_type : 'Bearer',
    scopes: parseGrantedScopes(parsed.scope, options.requestedScopes),
    environment: options.environment,
    environmentName: environment.name,
    baseUrl: environment.baseUrl,
    appFrameworkUrl: options.endpoints.appFrameworkUrl,
    identityUrl: options.endpoints.identityUrl,
    filesUrl: options.endpoints.filesUrl
  };
};

let requestToken = async (identityUrl: string, operation: string, params: URLSearchParams) => {
  let http = createAxios({
    baseURL: identityUrl,
    headers: {
      Accept: 'application/json'
    }
  });

  return await requestAxiosData<unknown>(
    operation,
    () =>
      http.post('/connect/token', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }),
    spareBankRegnskapApiError
  );
};

type SpareBankUserInfo = {
  sub?: unknown;
  name?: unknown;
  email?: unknown;
  picture?: unknown;
  preferred_username?: unknown;
};

export let auth = SlateAuth.create()
  .output(authOutputSchema)
  .addOauth({
    type: 'auth.oauth',
    name: 'SpareBank 1 Regnskap OAuth 2.0',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Unimicro authorization-code authentication',
        url: 'https://developer.unimicro.no/guide/authentication/auth-code'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'SpareBank 1 Regnskap OIDC scopes',
        url: 'https://login.regnskap.sparebank1.no/.well-known/openid-configuration'
      }
    ] satisfies SlateAuthDocsReference[],
    scopes: oauthScopes,
    inputSchema: oauthInputSchema,

    getAuthorizationUrl: async ctx => {
      let environment = selectedEnvironment(ctx.input.environment);
      let endpoints = await discoverEnvironmentEndpoints(environment);
      let requestedScopes = uniqueScopes([
        ...identityScopes,
        ...requiredApiScopes,
        ...ctx.scopes
      ]);
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        response_mode: 'query',
        state: ctx.state,
        scope: requestedScopes.join(' ')
      });

      let maybePkce = ctx as typeof ctx & {
        codeChallenge?: string;
        codeChallengeMethod?: string;
      };

      if (maybePkce.codeChallenge) {
        params.set('code_challenge', maybePkce.codeChallenge);
        params.set('code_challenge_method', maybePkce.codeChallengeMethod ?? 'S256');
      }

      return {
        url: `${endpoints.identityUrl}connect/authorize?${params.toString()}`,
        input: {
          environment
        }
      };
    },

    handleCallback: async ctx => {
      let environment = selectedEnvironment(ctx.input.environment);
      let endpoints = await discoverEnvironmentEndpoints(environment);
      let requestedScopes = uniqueScopes([
        ...identityScopes,
        ...requiredApiScopes,
        ...ctx.scopes
      ]);
      let params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      let maybePkce = ctx as typeof ctx & { codeVerifier?: string };
      if (maybePkce.codeVerifier) {
        params.set('code_verifier', maybePkce.codeVerifier);
      }

      let data = await requestToken(endpoints.identityUrl, 'OAuth token exchange', params);

      return {
        output: normalizeToken(data, {
          operation: 'token exchange',
          requestedScopes,
          environment,
          endpoints
        })
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw spareBankRegnskapValidationError(
          'No SpareBank 1 Regnskap refresh token is available.'
        );
      }

      let params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      let data = await requestToken(ctx.output.identityUrl, 'OAuth token refresh', params);

      return {
        output: normalizeToken(data, {
          operation: 'token refresh',
          requestedScopes: ctx.output.scopes ?? [],
          previousRefreshToken: ctx.output.refreshToken,
          environment: ctx.output.environment,
          endpoints: {
            appFrameworkUrl: ctx.output.appFrameworkUrl,
            identityUrl: ctx.output.identityUrl,
            filesUrl: ctx.output.filesUrl
          }
        })
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: ctx.output.identityUrl,
        headers: {
          Accept: 'application/json'
        }
      });

      let profile = await requestAxiosData<SpareBankUserInfo>(
        'profile lookup',
        () =>
          http.get('/connect/userinfo', {
            headers: {
              Authorization: `Bearer ${ctx.output.token}`
            }
          }),
        spareBankRegnskapApiError
      );

      let id =
        typeof profile.sub === 'string'
          ? profile.sub
          : typeof profile.preferred_username === 'string'
            ? profile.preferred_username
            : undefined;

      if (!id) {
        throw spareBankRegnskapValidationError(
          'SpareBank 1 Regnskap profile response did not include a user id.'
        );
      }

      return {
        profile: {
          id,
          name: typeof profile.name === 'string' ? profile.name : undefined,
          email: typeof profile.email === 'string' ? profile.email : undefined,
          imageUrl: typeof profile.picture === 'string' ? profile.picture : undefined,
          environment: ctx.output.environment,
          environmentName: ctx.output.environmentName
        }
      };
    }
  });
