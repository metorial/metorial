import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { BrightspaceClient } from './lib/client';
import { brightspaceError } from './lib/errors';
import { normalizeInstanceUrl } from './lib/instance';

let tokenClient = createAxios({
  baseURL: 'https://auth.brightspace.com',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
});
tokenClient.interceptors.response.use(undefined, error => {
  throw brightspaceError(error, 'OAuth token exchange');
});

let getProfile = async (ctx: {
  output: { token: string; instanceUrl?: string };
  input: { instanceUrl?: string };
}) => {
  let instanceUrl = ctx.output.instanceUrl ?? ctx.input.instanceUrl;
  if (!instanceUrl) return { profile: {} };
  let whoami = await new BrightspaceClient({
    instanceUrl,
    token: ctx.output.token,
    lpVersion: '1.49',
    leVersion: '1.82',
    basVersion: '1.4'
  }).getWhoAmI();
  return {
    profile: {
      id: String(whoami.Identifier),
      name: [whoami.FirstName, whoami.LastName].filter(Boolean).join(' ') || undefined
    }
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      instanceUrl: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Brightspace OAuth',
    key: 'oauth',
    scopes: [
      { title: 'Core API fallback', description: 'Core API fallback.', scope: 'core:*:*' },
      { title: 'Read users', description: 'Read users.', scope: 'users:userdata:read' },
      { title: 'Create users', description: 'Create users.', scope: 'users:userdata:create' },
      { title: 'Update users', description: 'Update users.', scope: 'users:userdata:update' },
      {
        title: 'Read own identity',
        description: 'Read own identity.',
        scope: 'users:own_profile:read'
      },
      {
        title: 'Read enrollments',
        description: 'Read enrollments.',
        scope: 'enrollment:orgunit:read'
      },
      {
        title: 'Create enrollments',
        description: 'Create enrollments.',
        scope: 'enrollment:orgunit:create'
      },
      {
        title: 'Remove enrollments',
        description: 'Remove enrollments.',
        scope: 'enrollment:orgunit:delete'
      },
      {
        title: 'Read own enrollments',
        description: 'Read own enrollments.',
        scope: 'enrollment:own_enrollment:read'
      },
      { title: 'Read courses', description: 'Read courses.', scope: 'orgunits:course:read' },
      {
        title: 'Create courses',
        description: 'Create courses.',
        scope: 'orgunits:course:create'
      },
      {
        title: 'Update courses',
        description: 'Update courses.',
        scope: 'orgunits:course:update'
      },
      {
        title: 'Delete courses',
        description: 'Delete courses.',
        scope: 'orgunits:course:delete'
      },
      {
        title: 'Read organization structure',
        description: 'Read organization structure.',
        scope: 'organizations:organization:read'
      },
      {
        title: 'Read organization types',
        description: 'Discover organizational unit types.',
        scope: 'organizations:organizationtypes:read'
      },
      {
        title: 'Read roles',
        description: 'Discover enrollment roles.',
        scope: 'role:detail:read'
      },
      {
        title: 'Read grade categories',
        description: 'Read grade categories.',
        scope: 'grades:gradecategories:read'
      },
      {
        title: 'Read discussion topics',
        description: 'Read topics in a forum.',
        scope: 'discussions:topics:readonly'
      },
      {
        title: 'Manage discussion topics',
        description: 'Create discussion topics.',
        scope: 'discussions:topics:manage'
      },
      {
        title: 'Delete assignments',
        description: 'Delete assignment folders.',
        scope: 'dropbox:folders:delete'
      },
      {
        title: 'Read content modules',
        description: 'Read content modules.',
        scope: 'content:modules:read'
      },
      {
        title: 'Manage content modules',
        description: 'Manage content modules.',
        scope: 'content:modules:manage'
      },
      {
        title: 'Read content topics',
        description: 'Read content topics.',
        scope: 'content:topics:read'
      },
      {
        title: 'Read grade values',
        description: 'Read grade values.',
        scope: 'grades:gradevalues:read'
      },
      {
        title: 'Write grade values',
        description: 'Write grade values.',
        scope: 'grades:gradevalues:write'
      },
      {
        title: 'Read grade items',
        description: 'Read grade items.',
        scope: 'grades:gradeobjects:read'
      },
      {
        title: 'Read assignments',
        description: 'Read assignments.',
        scope: 'dropbox:folders:read'
      },
      {
        title: 'Create assignments',
        description: 'Create assignments.',
        scope: 'dropbox:folders:write'
      },
      {
        title: 'Read groups',
        description: 'Read course groups and group categories.',
        scope: 'groups:group:read'
      },
      {
        title: 'Enroll group members',
        description: 'Add users to groups.',
        scope: 'groups:enrollment:create'
      },
      {
        title: 'Remove group members',
        description: 'Remove users from groups.',
        scope: 'groups:enrollment:delete'
      },
      { title: 'Read quizzes', description: 'Read quizzes.', scope: 'quizzing:quizzes:read' },
      {
        title: 'Read quiz attempts',
        description: 'Read quiz attempts.',
        scope: 'quizzing:attempts:read'
      },
      {
        title: 'Read discussion forums',
        description: 'Read discussion forums.',
        scope: 'discussions:forums:readonly'
      },
      {
        title: 'Manage discussion forums',
        description: 'Manage discussion forums.',
        scope: 'discussions:forums:manage'
      },
      {
        title: 'Read discussion posts',
        description: 'Read discussion posts.',
        scope: 'discussions:posts:readonly'
      },
      {
        title: 'Manage discussion posts',
        description: 'Manage discussion posts.',
        scope: 'discussions:posts:manage'
      },
      {
        title: 'Read announcements',
        description: 'Read announcements.',
        scope: 'news:newsitems:read'
      },
      {
        title: 'Manage announcements',
        description: 'Manage announcements.',
        scope: 'news:newsitems:manage'
      },
      {
        title: 'Read calendar events',
        description: 'Read calendar events.',
        scope: 'calendar:events:read'
      },
      {
        title: 'Write calendar events',
        description: 'Write calendar events.',
        scope: 'calendar:events:write'
      },
      {
        title: 'Delete calendar events',
        description: 'Delete calendar events.',
        scope: 'calendar:events:delete'
      }
    ],
    inputSchema: z.object({
      instanceUrl: z
        .string()
        .optional()
        .describe(
          'Your Brightspace HTTPS instance origin, such as https://school.brightspace.com.'
        )
    }),
    getAuthorizationUrl: async ctx => {
      let instanceUrl = normalizeInstanceUrl(ctx.input.instanceUrl);
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });
      return {
        url: `https://auth.brightspace.com/oauth2/auth?${params}`,
        input: { ...ctx.input, instanceUrl }
      };
    },
    handleCallback: async ctx => {
      let response = await tokenClient.post(
        '/core/connect/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString()
      );
      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Brightspace',
            operation: 'token exchange'
          }),
          instanceUrl: normalizeInstanceUrl(ctx.input.instanceUrl)
        },
        input: ctx.input
      };
    },
    handleTokenRefresh: async (ctx: {
      output: {
        token: string;
        refreshToken?: string;
        expiresAt?: string;
        instanceUrl?: string;
      };
      input: { instanceUrl?: string };
      clientId: string;
      clientSecret: string;
      scopes: string[];
    }) => {
      if (!ctx.output.refreshToken)
        throw createApiServiceError('Reconnect Brightspace to obtain a refresh token.', {
          reason: 'brightspace_missing_refresh_token'
        });
      let response = await tokenClient.post(
        '/core/connect/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          scope: ctx.scopes.join(' ')
        }).toString()
      );
      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Brightspace',
            operation: 'token refresh',
            previousRefreshToken: ctx.output.refreshToken,
            refreshTokenFallbackMode: 'falsy'
          }),
          instanceUrl: ctx.output.instanceUrl ?? ctx.input.instanceUrl
        },
        input: ctx.input
      };
    },
    getProfile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bearer Token',
    key: 'bearer_token',
    inputSchema: z.object({
      token: z.string().describe('Brightspace OAuth bearer token'),
      instanceUrl: z
        .string()
        .optional()
        .describe(
          'Your Brightspace HTTPS instance origin, such as https://school.brightspace.com.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('Provide a Brightspace bearer token.', {
          reason: 'brightspace_missing_token'
        });
      return {
        output: {
          token: ctx.input.token,
          instanceUrl: normalizeInstanceUrl(ctx.input.instanceUrl)
        }
      };
    }
  });
