import { createHash, randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import {
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth,
  type SlateAuthWithOauth
} from 'slates';
import { z } from 'zod';
import { postHogApiError, postHogServiceError } from './lib/errors';
import { getPrivateBaseUrl } from './lib/urls';

const regionSchema = z.enum(['us', 'eu', 'self-hosted']);
const locationSchema = {
  region: regionSchema.describe('PostHog cloud region (US or EU) or a self-hosted instance.'),
  instanceUrl: z
    .string()
    .url()
    .optional()
    .describe('HTTPS URL of your self-hosted PostHog instance. Required for self-hosted.'),
  projectToken: z
    .string()
    .optional()
    .describe('Project API key/token for event capture and flag evaluation')
};
const oauthInputSchema = z.object(locationSchema);
type OAuthInput = z.infer<typeof oauthInputSchema>;
type Location = { region: z.infer<typeof regionSchema>; instanceUrl?: string };
type AuthOutput = Location & {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  projectToken?: string;
};
const tokenInputSchema = z.object({
  ...locationSchema,
  apiKey: z.string().describe('Personal API key (starts with phx_)')
});

// Self-hosted URLs must be a public HTTPS origin so tokens never reach internal hosts.
const parseInstanceUrl = (value: string) => {
  const url = URL.parse(value);
  const host = url?.hostname.toLowerCase() ?? '';
  if (
    !url ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    isIP(host.replace(/^\[|\]$/g, '')) !== 0 ||
    !host.includes('.') ||
    /(^|\.)(localhost|local|localdomain|internal|home\.arpa)$/.test(host)
  ) {
    throw postHogServiceError(
      'Use the public HTTPS address of your self-hosted PostHog instance, such as https://posthog.example.com.'
    );
  }
  return url.origin;
};

const resolveLocation = (input: Location): Location => {
  if (input.region !== 'self-hosted') return { region: input.region };
  if (!input.instanceUrl) {
    throw postHogServiceError('A PostHog instance URL is required for self-hosted accounts.');
  }
  return { region: 'self-hosted', instanceUrl: parseInstanceUrl(input.instanceUrl) };
};

const getBaseUrl = (location: Location) => {
  const resolved = resolveLocation(location);
  return getPrivateBaseUrl(resolved.region, resolved.instanceUrl);
};

const getProfile = async (ctx: { output: AuthOutput }) => {
  const http = createAxios({
    baseURL: getBaseUrl(ctx.output),
    headers: { Authorization: `Bearer ${ctx.output.token}` }
  });
  try {
    const { data: user } = await http.get('/api/users/@me/');
    return {
      profile: {
        id: String(user.uuid ?? user.id),
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || undefined
      }
    };
  } catch (error) {
    throw postHogApiError(error, 'get account profile');
  }
};

const requestToken = async (location: Location, params: URLSearchParams) => {
  const { data } = await createAxios({ baseURL: getBaseUrl(location) }).post(
    '/oauth/token/',
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return data;
};

const createOAuthMethod = (
  publicClient: boolean
): SlateAuthWithOauth<OAuthInput, AuthOutput> => {
  // A confidential client is registered on PostHog Cloud; never send its secret elsewhere.
  const checkLocation = <T extends Location>(location: T) => {
    if (!publicClient && location.region === 'self-hosted') {
      throw postHogServiceError(
        'OAuth 2.0 supports PostHog Cloud only. For self-hosted PostHog, use a personal API key or OAuth 2.0 (Client Metadata URL).'
      );
    }
    return location;
  };
  return {
    type: 'auth.oauth',
    key: publicClient ? 'oauth_cimd' : 'oauth',
    name: publicClient ? 'OAuth 2.0 (Client Metadata URL)' : 'OAuth 2.0',
    scopes: [
      { title: 'Read Actions', description: 'Read actions', scope: 'action:read' },
      {
        title: 'Write Actions',
        description: 'Create and update actions',
        scope: 'action:write'
      },
      { title: 'Read Annotations', description: 'Read annotations', scope: 'annotation:read' },
      {
        title: 'Write Annotations',
        description: 'Create and update annotations',
        scope: 'annotation:write'
      },
      { title: 'Read Cohorts', description: 'Read cohorts', scope: 'cohort:read' },
      {
        title: 'Write Cohorts',
        description: 'Create and update cohorts',
        scope: 'cohort:write'
      },
      { title: 'Read Dashboards', description: 'Read dashboards', scope: 'dashboard:read' },
      {
        title: 'Write Dashboards',
        description: 'Create and update dashboards',
        scope: 'dashboard:write'
      },
      {
        title: 'Read Experiments',
        description: 'Read experiments (A/B tests)',
        scope: 'experiment:read'
      },
      {
        title: 'Write Experiments',
        description: 'Create and update experiments',
        scope: 'experiment:write'
      },
      {
        title: 'Read Feature Flags',
        description: 'Read feature flags',
        scope: 'feature_flag:read'
      },
      {
        title: 'Write Feature Flags',
        description: 'Create and update feature flags',
        scope: 'feature_flag:write'
      },
      { title: 'Read Insights', description: 'Read insights', scope: 'insight:read' },
      {
        title: 'Read Groups',
        description: 'Read groups and group types',
        scope: 'group:read'
      },
      {
        title: 'Write Groups',
        description: 'Create and update group properties',
        scope: 'group:write'
      },
      { title: 'Read Persons', description: 'Read person profiles', scope: 'person:read' },
      {
        title: 'Write Persons',
        description: 'Update and delete person profiles',
        scope: 'person:write'
      },
      {
        title: 'Read Organizations',
        description: 'Read organizations and discover projects',
        scope: 'organization:read'
      },
      {
        title: 'Read Users',
        description: 'Read the current user profile',
        scope: 'user:read'
      },
      { title: 'Read Projects', description: 'Read project settings', scope: 'project:read' },
      {
        title: 'Read Session Recordings',
        description: 'Read session recording metadata',
        scope: 'session_recording:read'
      },
      { title: 'Read Surveys', description: 'Read surveys', scope: 'survey:read' },
      {
        title: 'Write Surveys',
        description: 'Create and update surveys',
        scope: 'survey:write'
      },
      {
        title: 'Read Event Definitions',
        description: 'Read event definitions',
        scope: 'event_definition:read'
      },
      {
        title: 'Read Property Definitions',
        description: 'Read property definitions',
        scope: 'property_definition:read'
      },
      { title: 'Read Query', description: 'Run HogQL queries', scope: 'query:read' }
    ],

    inputSchema: oauthInputSchema,
    getAuthorizationUrl: async ctx => {
      if (publicClient && URL.parse(ctx.clientId)?.protocol !== 'https:') {
        throw postHogServiceError(
          'Use the HTTPS URL of your hosted PostHog client metadata document as the client ID.'
        );
      }
      const baseUrl = getBaseUrl(checkLocation(ctx.input));
      const codeVerifier = randomBytes(32).toString('base64url');
      const params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        code_challenge: createHash('sha256').update(codeVerifier).digest('base64url'),
        code_challenge_method: 'S256'
      });
      return {
        url: `${baseUrl}/oauth/authorize/?${params}`,
        callbackState: { codeVerifier }
      };
    },
    handleCallback: async ctx => {
      const codeVerifier: unknown = ctx.callbackState?.codeVerifier;
      if (typeof codeVerifier !== 'string' || !/^[A-Za-z0-9_-]{43,128}$/.test(codeVerifier)) {
        throw postHogServiceError(
          'PostHog OAuth verification state is missing. Restart the connection.'
        );
      }
      if (ctx.callbackParams?.error || !ctx.code) {
        throw postHogServiceError(
          'PostHog authorization was denied or canceled. Reconnect to grant access.'
        );
      }
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        client_id: ctx.clientId,
        code_verifier: codeVerifier
      });
      if (!publicClient) params.set('client_secret', ctx.clientSecret);
      try {
        const data = await requestToken(checkLocation(ctx.input), params);
        return {
          output: {
            ...normalizeOAuthTokenResponse(data, { providerLabel: 'PostHog' }),
            ...resolveLocation(ctx.input),
            projectToken: ctx.input.projectToken
          },
          ...(typeof data.scope === 'string'
            ? { scopes: data.scope.split(/\s+/).filter(Boolean) }
            : {})
        };
      } catch (error) {
        throw postHogApiError(error, 'exchange OAuth authorization code');
      }
    },
    handleTokenRefresh: async ctx => {
      if (!ctx.output.refreshToken)
        throw postHogServiceError(
          'PostHog OAuth refresh token is missing. Reconnect the account.'
        );
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId
      });
      if (!publicClient) params.set('client_secret', ctx.clientSecret);
      try {
        const data = await requestToken(checkLocation(ctx.output), params);
        return {
          output: {
            ...ctx.output,
            ...normalizeOAuthTokenResponse(data, {
              providerLabel: 'PostHog',
              previousRefreshToken: ctx.output.refreshToken,
              refreshTokenFallbackMode: 'falsy'
            })
          }
        };
      } catch (error) {
        throw postHogApiError(error, 'refresh OAuth token');
      }
    },
    getProfile
  };
};

export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      projectToken: z.string().optional(),
      region: regionSchema,
      instanceUrl: z.string().optional()
    })
  )
  .addOauth(createOAuthMethod(false))
  .addOauth(createOAuthMethod(true))
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal API Key',
    key: 'personal_api_key',
    inputSchema: tokenInputSchema,
    getOutput: async ctx => ({
      output: {
        token: ctx.input.apiKey,
        projectToken: ctx.input.projectToken,
        ...resolveLocation(ctx.input)
      }
    }),
    getProfile
  });
