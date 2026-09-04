import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse
} from 'slates';
import { z } from 'zod';

export let GOOGLE_OAUTH_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export let GOOGLE_OAUTH_TOKEN_BASE_URL = 'https://oauth2.googleapis.com';
export let GOOGLE_USERINFO_BASE_URL = 'https://www.googleapis.com';

export let googleOAuthOutputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  authMethod: z.literal('oauth')
});

export type GoogleOAuthBaseOutput = z.infer<typeof googleOAuthOutputSchema>;
export type GoogleOAuthOutput<AdditionalOutput extends {} = {}> = GoogleOAuthBaseOutput &
  AdditionalOutput;

export type GoogleOAuthScopeDescriptor = {
  title: string;
  description?: string;
  scope: string;
};

export type GoogleOAuthDocsReference = {
  type?: 'docs.auth.oauth' | 'docs.auth.oauth_scopes';
  name: string;
  url: string;
};

export type GoogleOAuthTokenRequest = {
  code?: string;
  refreshToken?: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  grantType: 'authorization_code' | 'refresh_token';
};

export type GoogleOAuthDependencies = {
  requestToken: (request: GoogleOAuthTokenRequest) => Promise<unknown>;
  getUserInfo: (accessToken: string) => Promise<unknown>;
  now: () => number;
};

export type GoogleOAuthAdditionalInput<InputType extends {}, AdditionalOutput extends {}> = {
  schema: z.ZodType<InputType>;
  mapToOutput: (input: InputType) => AdditionalOutput;
};

export type GoogleOAuthOptions<InputType extends {} = {}, AdditionalOutput extends {} = {}> = {
  scopes: GoogleOAuthScopeDescriptor[];
  name?: string;
  key?: string;
  docs?: GoogleOAuthDocsReference[];
  dependencies?: Partial<GoogleOAuthDependencies>;
  additionalInput?: GoogleOAuthAdditionalInput<InputType, AdditionalOutput>;
};

export type GoogleAuthorizationUrlContext<InputType extends {} = {}> = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  input?: InputType;
};

export type GoogleOAuthCallbackContext<InputType extends {} = {}> = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  code: string;
  input?: InputType;
};

export type GoogleOAuthRefreshContext<
  AdditionalOutput extends {} = {},
  InputType extends {} = {}
> = {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  output: GoogleOAuthOutput<AdditionalOutput>;
  input?: InputType;
};

export type GoogleOAuthProfileContext<
  AdditionalOutput extends {} = {},
  InputType extends {} = {}
> = {
  output: GoogleOAuthOutput<AdditionalOutput>;
  scopes: string[];
  input?: InputType;
};

let tokenClient = createAxios({ baseURL: GOOGLE_OAUTH_TOKEN_BASE_URL });
let userInfoClient = createAxios({ baseURL: GOOGLE_USERINFO_BASE_URL });

let defaultDependencies: GoogleOAuthDependencies = {
  requestToken: async request => {
    let fields = new URLSearchParams({
      client_id: request.clientId,
      client_secret: request.clientSecret,
      grant_type: request.grantType
    });
    if (request.grantType === 'authorization_code') {
      fields.set('code', request.code ?? '');
      fields.set('redirect_uri', request.redirectUri ?? '');
    } else {
      fields.set('refresh_token', request.refreshToken ?? '');
    }

    let response = await tokenClient.post('/token', fields.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  },
  getUserInfo: async accessToken => {
    let response = await userInfoClient.get('/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
  },
  now: () => Date.now()
};

let defaultDocs: GoogleOAuthDocsReference[] = [
  {
    type: 'docs.auth.oauth',
    name: 'OAuth documentation',
    url: 'https://support.google.com/cloud/answer/15544987'
  },
  {
    type: 'docs.auth.oauth_scopes',
    name: 'OAuth scopes',
    url: 'https://developers.google.com/identity/protocols/oauth2/scopes'
  }
];

let assertValidScopeDescriptors = (scopes: GoogleOAuthScopeDescriptor[]) => {
  let seenScopes = new Set<string>();

  for (let descriptor of scopes) {
    if (!descriptor.title.trim() || !descriptor.scope.trim()) {
      throw createApiServiceError('Google OAuth scope titles and values must be non-empty.', {
        reason: 'google_oauth_configuration'
      });
    }
    if (seenScopes.has(descriptor.scope)) {
      throw createApiServiceError(
        `Google OAuth scope "${descriptor.scope}" is declared more than once.`,
        { reason: 'google_oauth_configuration' }
      );
    }
    seenScopes.add(descriptor.scope);
  }
};

let parseGrantedScopes = (data: unknown, requestedScopes: string[]) => {
  if (typeof data !== 'object' || data === null || !('scope' in data)) {
    return [...requestedScopes];
  }

  let rawScope = (data as { scope?: unknown }).scope;
  if (typeof rawScope !== 'string') {
    return [...requestedScopes];
  }

  let scopes = rawScope.split(/\s+/).filter(Boolean);
  return scopes.length > 0 ? scopes : [...requestedScopes];
};

let mapGoogleProfile = (data: unknown) => {
  let user =
    typeof data === 'object' && data !== null
      ? (data as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  return {
    ...(typeof user.id === 'string' ? { id: user.id } : {}),
    ...(typeof user.email === 'string' ? { email: user.email } : {}),
    ...(typeof user.name === 'string' ? { name: user.name } : {}),
    ...(typeof user.picture === 'string' ? { imageUrl: user.picture } : {})
  };
};

let normalizeTokenOutput = (
  data: unknown,
  dependencies: GoogleOAuthDependencies,
  operation: string,
  previousRefreshToken?: string
): GoogleOAuthBaseOutput => ({
  ...normalizeOAuthTokenResponse(data, {
    providerLabel: 'Google',
    operation,
    previousRefreshToken,
    nowMs: dependencies.now()
  }),
  authMethod: 'oauth'
});

let assertAdditionalOutput = (data: Record<string, unknown>) => {
  let reservedKeys = ['token', 'refreshToken', 'expiresAt', 'authMethod'];
  let conflictingKey = reservedKeys.find(key => key in data);
  if (conflictingKey) {
    throw createApiServiceError(
      `Google OAuth additional output cannot override reserved field "${conflictingKey}".`,
      { reason: 'google_oauth_configuration' }
    );
  }
};

export let createGoogleOAuth = <InputType extends {} = {}, AdditionalOutput extends {} = {}>({
  scopes,
  name = 'Google OAuth',
  key = 'oauth',
  docs = defaultDocs,
  dependencies: dependencyOverrides,
  additionalInput
}: GoogleOAuthOptions<InputType, AdditionalOutput>) => {
  assertValidScopeDescriptors(scopes);
  let dependencies = { ...defaultDependencies, ...dependencyOverrides };

  return {
    type: 'auth.oauth' as const,
    name,
    key,
    scopes: scopes.map(scope => ({ ...scope })),
    docs,
    ...(additionalInput ? { inputSchema: additionalInput.schema } : {}),

    getAuthorizationUrl: async (ctx: GoogleAuthorizationUrlContext<InputType>) => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: ctx.scopes.join(' '),
        access_type: 'offline',
        include_granted_scopes: 'true',
        prompt: 'consent'
      });

      return {
        url: `${GOOGLE_OAUTH_AUTHORIZATION_URL}?${params.toString()}`,
        ...(additionalInput ? { input: ctx.input } : {})
      };
    },

    handleCallback: async (ctx: GoogleOAuthCallbackContext<InputType>) => {
      try {
        let data = await dependencies.requestToken({
          code: ctx.code,
          clientId: ctx.clientId,
          clientSecret: ctx.clientSecret,
          redirectUri: ctx.redirectUri,
          grantType: 'authorization_code'
        });

        let additionalOutput = additionalInput
          ? additionalInput.mapToOutput(ctx.input as InputType)
          : ({} as AdditionalOutput);
        assertAdditionalOutput(additionalOutput);

        return {
          output: {
            ...normalizeTokenOutput(data, dependencies, 'authorization callback'),
            ...additionalOutput
          } as GoogleOAuthOutput<AdditionalOutput>,
          scopes: parseGrantedScopes(data, ctx.scopes),
          ...(additionalInput ? { input: ctx.input } : {})
        };
      } catch (error) {
        throw buildApiServiceError(error, {
          providerLabel: 'Google OAuth',
          operation: 'authorization callback',
          reason: 'google_oauth_callback'
        });
      }
    },

    handleTokenRefresh: async (
      ctx: GoogleOAuthRefreshContext<AdditionalOutput, InputType>
    ) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'No Google refresh token is available. Reconnect and grant offline access.',
          { reason: 'google_oauth_refresh_token_missing' }
        );
      }

      try {
        let data = await dependencies.requestToken({
          refreshToken: ctx.output.refreshToken,
          clientId: ctx.clientId,
          clientSecret: ctx.clientSecret,
          grantType: 'refresh_token'
        });

        return {
          output: {
            ...ctx.output,
            ...normalizeTokenOutput(
              data,
              dependencies,
              'token refresh',
              ctx.output.refreshToken
            )
          } as GoogleOAuthOutput<AdditionalOutput>,
          ...(additionalInput ? { input: ctx.input } : {})
        };
      } catch (error) {
        throw buildApiServiceError(error, {
          providerLabel: 'Google OAuth',
          operation: 'token refresh',
          reason: 'google_oauth_refresh'
        });
      }
    },

    getProfile: async (ctx: GoogleOAuthProfileContext<AdditionalOutput, InputType>) => {
      try {
        return { profile: mapGoogleProfile(await dependencies.getUserInfo(ctx.output.token)) };
      } catch (error) {
        throw buildApiServiceError(error, {
          providerLabel: 'Google',
          operation: 'user profile request',
          reason: 'google_profile_request'
        });
      }
    }
  };
};

export let createGoogleOauth = createGoogleOAuth;
