import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      canvasDomain: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth2',
    key: 'oauth2',

    inputSchema: z.object({
      canvasDomain: z
        .string()
        .describe('Your Canvas instance domain (e.g., myschool.instructure.com)')
    }),

    scopes: [
      {
        title: 'User Profile',
        description: 'Access user profile information',
        scope: 'url:GET|/api/v1/users/:user_id/profile'
      },
      {
        title: 'List Courses',
        description: 'List courses for the current user or account',
        scope: 'url:GET|/api/v1/courses'
      },
      {
        title: 'Manage Courses',
        description: 'Create and update courses',
        scope: 'url:POST|/api/v1/accounts/:account_id/courses'
      },
      {
        title: 'Get Course',
        description: 'Retrieve a single course by ID',
        scope: 'url:GET|/api/v1/courses/:id'
      },
      {
        title: 'Update Course',
        description: 'Update course settings',
        scope: 'url:PUT|/api/v1/courses/:id'
      },
      {
        title: 'Delete Course',
        description: 'Delete or conclude a course',
        scope: 'url:DELETE|/api/v1/courses/:id'
      },
      {
        title: 'List Users',
        description: 'List users in an account',
        scope: 'url:GET|/api/v1/accounts/:account_id/users'
      },
      {
        title: 'List Course Users',
        description: 'List users enrolled in a course',
        scope: 'url:GET|/api/v1/courses/:course_id/users'
      },
      {
        title: 'List Enrollments',
        description: 'List enrollments in a course',
        scope: 'url:GET|/api/v1/courses/:course_id/enrollments'
      },
      {
        title: 'Create Enrollment',
        description: 'Enroll a user in a course',
        scope: 'url:POST|/api/v1/courses/:course_id/enrollments'
      },
      {
        title: 'List Assignments',
        description: 'List assignments in a course',
        scope: 'url:GET|/api/v1/courses/:course_id/assignments'
      },
      {
        title: 'Get Assignment',
        description: 'Get a single assignment',
        scope: 'url:GET|/api/v1/courses/:course_id/assignments/:id'
      },
      {
        title: 'Create Assignment',
        description: 'Create a new assignment',
        scope: 'url:POST|/api/v1/courses/:course_id/assignments'
      },
      {
        title: 'Update Assignment',
        description: 'Update an existing assignment',
        scope: 'url:PUT|/api/v1/courses/:course_id/assignments/:id'
      },
      {
        title: 'Delete Assignment',
        description: 'Delete an assignment',
        scope: 'url:DELETE|/api/v1/courses/:course_id/assignments/:id'
      },
      {
        title: 'List Submissions',
        description: 'List submissions for an assignment',
        scope: 'url:GET|/api/v1/courses/:course_id/assignments/:assignment_id/submissions'
      },
      {
        title: 'Update Submission',
        description: 'Grade or comment on a submission',
        scope:
          'url:PUT|/api/v1/courses/:course_id/assignments/:assignment_id/submissions/:user_id'
      },
      {
        title: 'List Modules',
        description: 'List modules in a course',
        scope: 'url:GET|/api/v1/courses/:course_id/modules'
      },
      {
        title: 'Create Module',
        description: 'Create a new module',
        scope: 'url:POST|/api/v1/courses/:course_id/modules'
      },
      {
        title: 'Update Module',
        description: 'Update a module',
        scope: 'url:PUT|/api/v1/courses/:course_id/modules/:id'
      },
      {
        title: 'List Discussion Topics',
        description: 'List discussion topics in a course',
        scope: 'url:GET|/api/v1/courses/:course_id/discussion_topics'
      },
      {
        title: 'Create Discussion Topic',
        description: 'Create a new discussion topic',
        scope: 'url:POST|/api/v1/courses/:course_id/discussion_topics'
      },
      {
        title: 'List Pages',
        description: 'List wiki pages in a course',
        scope: 'url:GET|/api/v1/courses/:course_id/pages'
      },
      {
        title: 'Create Page',
        description: 'Create a wiki page',
        scope: 'url:POST|/api/v1/courses/:course_id/pages'
      },
      {
        title: 'List Files',
        description: 'List files in a course',
        scope: 'url:GET|/api/v1/courses/:course_id/files'
      },
      {
        title: 'List Calendar Events',
        description: 'List calendar events',
        scope: 'url:GET|/api/v1/calendar_events'
      },
      {
        title: 'Create Calendar Event',
        description: 'Create a calendar event',
        scope: 'url:POST|/api/v1/calendar_events'
      },
      {
        title: 'List Conversations',
        description: 'List conversations for the current user',
        scope: 'url:GET|/api/v1/conversations'
      },
      {
        title: 'Create Conversation',
        description: 'Send a message',
        scope: 'url:POST|/api/v1/conversations'
      },
      {
        title: 'List Quizzes',
        description: 'List quizzes in a course',
        scope: 'url:GET|/api/v1/courses/:course_id/quizzes'
      },
      {
        title: 'List Groups',
        description: 'List groups in a context',
        scope: 'url:GET|/api/v1/courses/:course_id/groups'
      },
      {
        title: 'List Rubrics',
        description: 'List rubrics in a course',
        scope: 'url:GET|/api/v1/courses/:course_id/rubrics'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let domain = ctx.input.canvasDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `https://${domain}/login/oauth2/auth?${params.toString()}`,
        input: { canvasDomain: domain }
      };
    },

    handleCallback: async ctx => {
      let domain = ctx.input.canvasDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      let http = createAxios({
        baseURL: `https://${domain}`
      });

      let response = await http.post('/login/oauth2/token', {
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      });

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          canvasDomain: domain
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let domain = ctx.output.canvasDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      let http = createAxios({
        baseURL: `https://${domain}`
      });

      let response = await http.post('/login/oauth2/token', {
        grant_type: 'refresh_token',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: ctx.output.refreshToken
      });

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: ctx.output.refreshToken,
          expiresAt,
          canvasDomain: domain
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; canvasDomain: string };
      input: { canvasDomain: string };
      scopes: string[];
    }) => {
      let domain = ctx.output.canvasDomain;
      let http = createAxios({
        baseURL: `https://${domain}/api/v1`,
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await http.get('/users/self/profile');
      let profile = response.data;

      return {
        profile: {
          id: String(profile.id),
          email: profile.primary_email || profile.login_id,
          name: profile.name,
          imageUrl: profile.avatar_url
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Canvas personal access token. Generate one from Account > Settings > New Access Token.'
        ),
      canvasDomain: z
        .string()
        .describe('Your Canvas instance domain (e.g., myschool.instructure.com)')
    }),

    getOutput: async ctx => {
      let domain = ctx.input.canvasDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      return {
        output: {
          token: ctx.input.token,
          canvasDomain: domain
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; canvasDomain: string };
      input: { token: string; canvasDomain: string };
    }) => {
      let domain = ctx.output.canvasDomain;
      let http = createAxios({
        baseURL: `https://${domain}/api/v1`,
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await http.get('/users/self/profile');
      let profile = response.data;

      return {
        profile: {
          id: String(profile.id),
          email: profile.primary_email || profile.login_id,
          name: profile.name,
          imageUrl: profile.avatar_url
        }
      };
    }
  });
