import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Brightspace OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Core Full Access',
        description: 'Full access to core APIs (fallback for unmapped actions)',
        scope: 'core:*:*'
      },
      { title: 'Users Read', description: 'Read user data', scope: 'users:userdata:read' },
      {
        title: 'Users Create',
        description: 'Create user accounts',
        scope: 'users:userdata:create'
      },
      {
        title: 'Users Update',
        description: 'Update user accounts',
        scope: 'users:userdata:update'
      },
      {
        title: 'Users Delete',
        description: 'Delete user accounts',
        scope: 'users:userdata:delete'
      },
      {
        title: 'Profile Read',
        description: 'Read user profiles',
        scope: 'users:profile:read'
      },
      {
        title: 'Own Profile',
        description: 'Read own profile',
        scope: 'users:own_profile:read'
      },
      {
        title: 'Enrollment Read',
        description: 'Read enrollment data',
        scope: 'enrollment:orgunit:read'
      },
      {
        title: 'Enrollment Create',
        description: 'Create enrollments',
        scope: 'enrollment:orgunit:create'
      },
      {
        title: 'Enrollment Delete',
        description: 'Delete enrollments',
        scope: 'enrollment:orgunit:delete'
      },
      {
        title: 'Own Enrollment',
        description: 'Read own enrollment data',
        scope: 'enrollment:own_enrollment:read'
      },
      {
        title: 'Course Read',
        description: 'Read course offerings',
        scope: 'orgunits:course:read'
      },
      {
        title: 'Course Create',
        description: 'Create course offerings',
        scope: 'orgunits:course:create'
      },
      {
        title: 'Course Update',
        description: 'Update course offerings',
        scope: 'orgunits:course:update'
      },
      {
        title: 'Course Delete',
        description: 'Delete course offerings',
        scope: 'orgunits:course:delete'
      },
      {
        title: 'Template Read',
        description: 'Read course templates',
        scope: 'orgunits:coursetemplate:read'
      },
      {
        title: 'Template Create',
        description: 'Create course templates',
        scope: 'orgunits:coursetemplate:create'
      },
      {
        title: 'Content Read',
        description: 'Read course content modules',
        scope: 'content:modules:read'
      },
      {
        title: 'Content Manage',
        description: 'Manage course content modules',
        scope: 'content:modules:manage'
      },
      {
        title: 'Topics Read',
        description: 'Read course content topics',
        scope: 'content:topics:read'
      },
      {
        title: 'Topics Manage',
        description: 'Manage course content topics',
        scope: 'content:topics:manage'
      },
      {
        title: 'Grades Read',
        description: 'Read grade data',
        scope: 'grades:gradevalues:read'
      },
      {
        title: 'Grades Write',
        description: 'Write grade data',
        scope: 'grades:gradevalues:write'
      },
      {
        title: 'Grade Items Read',
        description: 'Read grade objects',
        scope: 'grades:gradeobjects:read'
      },
      {
        title: 'Grade Items Write',
        description: 'Write grade objects',
        scope: 'grades:gradeobjects:write'
      },
      {
        title: 'Dropbox Read',
        description: 'Read assignment dropbox folders',
        scope: 'dropbox:folders:read'
      },
      {
        title: 'Dropbox Write',
        description: 'Write assignment dropbox folders',
        scope: 'dropbox:folders:write'
      },
      {
        title: 'Dropbox Delete',
        description: 'Delete assignment dropbox folders',
        scope: 'dropbox:folders:delete'
      },
      { title: 'Quizzes Read', description: 'Read quizzes', scope: 'quizzes:quizzes:read' },
      {
        title: 'Quizzes Write',
        description: 'Manage quizzes',
        scope: 'quizzes:quizzes:write'
      },
      {
        title: 'Discussions Read',
        description: 'Read discussion forums',
        scope: 'discussions:forums:read'
      },
      {
        title: 'Discussions Manage',
        description: 'Manage discussion forums',
        scope: 'discussions:forums:manage'
      },
      {
        title: 'Posts Read',
        description: 'Read discussion posts',
        scope: 'discussions:posts:read'
      },
      {
        title: 'Posts Manage',
        description: 'Manage discussion posts',
        scope: 'discussions:posts:manage'
      },
      {
        title: 'News Read',
        description: 'Read news/announcements',
        scope: 'news:newsitems:read'
      },
      {
        title: 'News Manage',
        description: 'Manage news/announcements',
        scope: 'news:newsitems:manage'
      },
      {
        title: 'Calendar Read',
        description: 'Read calendar events',
        scope: 'calendar:events:read'
      },
      {
        title: 'Calendar Write',
        description: 'Manage calendar events',
        scope: 'calendar:events:write'
      },
      {
        title: 'Awards Read',
        description: 'Read awards and badges',
        scope: 'awards:awards:read'
      },
      {
        title: 'Awards Manage',
        description: 'Manage awards and badges',
        scope: 'awards:awards:manage'
      },
      {
        title: 'Groups Read',
        description: 'Read groups and sections',
        scope: 'groups:groups:read'
      },
      {
        title: 'Groups Manage',
        description: 'Manage groups and sections',
        scope: 'groups:groups:manage'
      },
      {
        title: 'OrgUnit Read',
        description: 'Read org unit structure',
        scope: 'orgunits:orgunit:read'
      },
      {
        title: 'OrgUnit Manage',
        description: 'Manage org unit structure',
        scope: 'orgunits:orgunit:manage'
      },
      {
        title: 'Completion Read',
        description: 'Read enrollment completion data',
        scope: 'enrollment:completion:read'
      },
      {
        title: 'Completion Update',
        description: 'Update enrollment completion',
        scope: 'enrollment:completion:update'
      },
      {
        title: 'Password Write',
        description: 'Manage user passwords',
        scope: 'users:password:write'
      }
    ],

    inputSchema: z.object({
      instanceUrl: z
        .string()
        .optional()
        .describe(
          'Your Brightspace instance URL (e.g. https://myschool.brightspace.com). Used only for token refresh and profile retrieval.'
        )
    }),

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://auth.brightspace.com/oauth2/auth?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let client = createAxios({
        baseURL: 'https://auth.brightspace.com',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      let response = await client.post(
        '/core/connect/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString()
      );

      let data = response.data as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
        error?: string;
        error_description?: string;
      };

      if (!data.access_token) {
        throw new Error(
          `Brightspace OAuth error: ${data.error_description || data.error || 'No access token received'}`
        );
      }

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        },
        input: ctx.input
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let client = createAxios({
        baseURL: 'https://auth.brightspace.com',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      let response = await client.post(
        '/core/connect/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          scope: ctx.scopes.join(' ')
        }).toString()
      );

      let data = response.data as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        error?: string;
        error_description?: string;
      };

      if (!data.access_token) {
        throw new Error(
          `Brightspace token refresh error: ${data.error_description || data.error || 'No access token received'}`
        );
      }

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        },
        input: ctx.input
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: { instanceUrl?: string };
      scopes: string[];
    }) => {
      let instanceUrl = ctx.input.instanceUrl;
      if (!instanceUrl) {
        return { profile: {} };
      }

      let baseUrl = instanceUrl.replace(/\/+$/, '');
      let client = createAxios({
        baseURL: baseUrl,
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Content-Type': 'application/json'
        }
      });

      try {
        let response = await client.get('/d2l/api/lp/1.49/users/whoami');
        let data = response.data as {
          Identifier?: string;
          FirstName?: string;
          LastName?: string;
          UniqueName?: string;
          ProfileIdentifier?: string;
        };

        return {
          profile: {
            id: data.Identifier,
            name: [data.FirstName, data.LastName].filter(Boolean).join(' ') || undefined,
            email: data.UniqueName
          }
        };
      } catch {
        return { profile: {} };
      }
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bearer Token',
    key: 'bearer_token',

    inputSchema: z.object({
      token: z.string().describe('Brightspace OAuth bearer token or API access token')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
