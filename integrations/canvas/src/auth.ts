import { createApiServiceError, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { CanvasClient, createCanvasHttp, normalizeCanvasDomain } from './lib/client';

let domainSchema = z
  .string()
  .describe('Your Canvas instance domain, such as school.instructure.com');

async function getProfile(ctx: { output: { token: string; canvasDomain: string } }) {
  let profile = await new CanvasClient(ctx.output).getSelf();
  if (profile.id === undefined || profile.id === null) {
    throw createApiServiceError(
      'Canvas did not return a user ID. Reconnect your Canvas account.'
    );
  }
  return {
    profile: {
      id: String(profile.id),
      email: profile.primary_email || profile.login_id,
      name: profile.name,
      imageUrl: profile.avatar_url
    }
  };
}

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
    inputSchema: z.object({ canvasDomain: domainSchema }),
    scopes: [
      {
        title: 'Get user profile',
        description: 'Get user profile',
        scope: 'url:GET|/api/v1/users/:user_id/profile'
      },
      { title: 'List courses', description: 'List courses', scope: 'url:GET|/api/v1/courses' },
      { title: 'Get course', description: 'Get course', scope: 'url:GET|/api/v1/courses/:id' },
      {
        title: 'List course creation accounts',
        description: 'List course creation accounts',
        scope: 'url:GET|/api/v1/course_creation_accounts'
      },
      {
        title: 'Create course',
        description: 'Create course',
        scope: 'url:POST|/api/v1/accounts/:account_id/courses'
      },
      {
        title: 'Update course',
        description: 'Update course',
        scope: 'url:PUT|/api/v1/courses/:id'
      },
      {
        title: 'Delete or conclude course',
        description: 'Delete or conclude course',
        scope: 'url:DELETE|/api/v1/courses/:id'
      },
      {
        title: 'List course users',
        description: 'List course users',
        scope: 'url:GET|/api/v1/courses/:course_id/users'
      },
      {
        title: 'List enrollments',
        description: 'List enrollments',
        scope: 'url:GET|/api/v1/courses/:course_id/enrollments'
      },
      {
        title: 'Enroll user',
        description: 'Enroll user',
        scope: 'url:POST|/api/v1/courses/:course_id/enrollments'
      },
      {
        title: 'Remove enrollment',
        description: 'Remove enrollment',
        scope: 'url:DELETE|/api/v1/courses/:course_id/enrollments/:id'
      },
      {
        title: 'List assignments',
        description: 'List assignments',
        scope: 'url:GET|/api/v1/courses/:course_id/assignments'
      },
      {
        title: 'Get assignment',
        description: 'Get assignment',
        scope: 'url:GET|/api/v1/courses/:course_id/assignments/:id'
      },
      {
        title: 'Create assignment',
        description: 'Create assignment',
        scope: 'url:POST|/api/v1/courses/:course_id/assignments'
      },
      {
        title: 'Update assignment',
        description: 'Update assignment',
        scope: 'url:PUT|/api/v1/courses/:course_id/assignments/:id'
      },
      {
        title: 'Delete assignment',
        description: 'Delete assignment',
        scope: 'url:DELETE|/api/v1/courses/:course_id/assignments/:id'
      },
      {
        title: 'List assignment groups',
        description: 'List assignment groups',
        scope: 'url:GET|/api/v1/courses/:course_id/assignment_groups'
      },
      {
        title: 'List submissions',
        description: 'List submissions',
        scope: 'url:GET|/api/v1/courses/:course_id/assignments/:assignment_id/submissions'
      },
      {
        title: 'Grade submission',
        description: 'Grade submission',
        scope:
          'url:PUT|/api/v1/courses/:course_id/assignments/:assignment_id/submissions/:user_id'
      },
      {
        title: 'List modules',
        description: 'List modules',
        scope: 'url:GET|/api/v1/courses/:course_id/modules'
      },
      {
        title: 'Create module',
        description: 'Create module',
        scope: 'url:POST|/api/v1/courses/:course_id/modules'
      },
      {
        title: 'Update module',
        description: 'Update module',
        scope: 'url:PUT|/api/v1/courses/:course_id/modules/:id'
      },
      {
        title: 'Delete module',
        description: 'Delete module',
        scope: 'url:DELETE|/api/v1/courses/:course_id/modules/:id'
      },
      {
        title: 'List module items',
        description: 'List module items',
        scope: 'url:GET|/api/v1/courses/:course_id/modules/:module_id/items'
      },
      {
        title: 'Create module item',
        description: 'Create module item',
        scope: 'url:POST|/api/v1/courses/:course_id/modules/:module_id/items'
      },
      {
        title: 'List discussions',
        description: 'List discussions',
        scope: 'url:GET|/api/v1/courses/:course_id/discussion_topics'
      },
      {
        title: 'Get discussion',
        description: 'Get discussion',
        scope: 'url:GET|/api/v1/courses/:course_id/discussion_topics/:topic_id'
      },
      {
        title: 'Create discussion',
        description: 'Create discussion',
        scope: 'url:POST|/api/v1/courses/:course_id/discussion_topics'
      },
      {
        title: 'Update discussion',
        description: 'Update discussion',
        scope: 'url:PUT|/api/v1/courses/:course_id/discussion_topics/:topic_id'
      },
      {
        title: 'Delete discussion',
        description: 'Delete discussion',
        scope: 'url:DELETE|/api/v1/courses/:course_id/discussion_topics/:topic_id'
      },
      {
        title: 'List pages',
        description: 'List pages',
        scope: 'url:GET|/api/v1/courses/:course_id/pages'
      },
      {
        title: 'Get page',
        description: 'Get page',
        scope: 'url:GET|/api/v1/courses/:course_id/pages/:url_or_id'
      },
      {
        title: 'Create page',
        description: 'Create page',
        scope: 'url:POST|/api/v1/courses/:course_id/pages'
      },
      {
        title: 'Update page',
        description: 'Update page',
        scope: 'url:PUT|/api/v1/courses/:course_id/pages/:url_or_id'
      },
      {
        title: 'Delete page',
        description: 'Delete page',
        scope: 'url:DELETE|/api/v1/courses/:course_id/pages/:url_or_id'
      },
      {
        title: 'List files',
        description: 'List files',
        scope: 'url:GET|/api/v1/courses/:course_id/files'
      },
      { title: 'Get file', description: 'Get file', scope: 'url:GET|/api/v1/files/:id' },
      {
        title: 'Download file',
        description: 'Download file',
        scope: 'url:GET|/files/:file_id/download'
      },
      {
        title: 'List calendar events',
        description: 'List calendar events',
        scope: 'url:GET|/api/v1/calendar_events'
      },
      {
        title: 'Create calendar event',
        description: 'Create calendar event',
        scope: 'url:POST|/api/v1/calendar_events'
      },
      {
        title: 'Update calendar event',
        description: 'Update calendar event',
        scope: 'url:PUT|/api/v1/calendar_events/:id'
      },
      {
        title: 'Delete calendar event',
        description: 'Delete calendar event',
        scope: 'url:DELETE|/api/v1/calendar_events/:id'
      },
      {
        title: 'List conversations',
        description: 'List conversations',
        scope: 'url:GET|/api/v1/conversations'
      },
      {
        title: 'Get conversation',
        description: 'Get conversation',
        scope: 'url:GET|/api/v1/conversations/:id'
      },
      {
        title: 'Send message',
        description: 'Send message',
        scope: 'url:POST|/api/v1/conversations'
      },
      {
        title: 'Get classic quiz',
        description: 'Get classic quiz',
        scope: 'url:GET|/api/v1/courses/:course_id/quizzes/:id'
      },
      {
        title: 'List classic quizzes',
        description: 'List classic quizzes',
        scope: 'url:GET|/api/v1/courses/:course_id/quizzes'
      },
      {
        title: 'Course activity analytics',
        description: 'Course activity analytics',
        scope: 'url:GET|/api/v1/courses/:course_id/analytics/activity'
      },
      {
        title: 'Course assignment analytics',
        description: 'Course assignment analytics',
        scope: 'url:GET|/api/v1/courses/:course_id/analytics/assignments'
      },
      {
        title: 'Course student analytics',
        description: 'Course student analytics',
        scope: 'url:GET|/api/v1/courses/:course_id/analytics/student_summaries'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let domain = normalizeCanvasDomain(ctx.input.canvasDomain);
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });
      if (ctx.scopes.length > 0) params.set('scope', ctx.scopes.join(' '));
      return {
        url: `https://${domain}/login/oauth2/auth?${params}`,
        input: { canvasDomain: domain }
      };
    },
    handleCallback: async ctx => {
      let domain = normalizeCanvasDomain(ctx.input.canvasDomain);
      let response = await createCanvasHttp(domain).post(
        '/login/oauth2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Canvas',
            operation: 'token exchange'
          }),
          canvasDomain: domain
        }
      };
    },
    handleTokenRefresh: async (ctx: {
      output: {
        token: string;
        refreshToken?: string;
        expiresAt?: string;
        canvasDomain: string;
      };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'A Canvas refresh token is required. Reconnect your Canvas account.'
        );
      }
      let domain = normalizeCanvasDomain(ctx.output.canvasDomain);
      let response = await createCanvasHttp(domain).post(
        '/login/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Canvas',
            operation: 'token refresh',
            previousRefreshToken: ctx.output.refreshToken
          }),
          canvasDomain: domain
        }
      };
    },
    getProfile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Canvas personal access token for testing your own account. Multi-user applications must use OAuth2.'
        ),
      canvasDomain: domainSchema
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('Enter your Canvas access token.');
      return {
        output: {
          token: ctx.input.token,
          canvasDomain: normalizeCanvasDomain(ctx.input.canvasDomain)
        }
      };
    },
    getProfile
  });
