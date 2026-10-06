import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { apiEndpoints, type BugsnagAuth, BugsnagClient, requireId } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiEndpoint: z.enum(apiEndpoints).optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Auth Token',
    key: 'personal_auth_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Bugsnag Personal Auth Token. Generate one in the Bugsnag dashboard under My Account → Personal Auth Tokens.'
        ),
      apiEndpoint: z
        .enum(apiEndpoints)
        .optional()
        .describe(
          'Data Access endpoint matching your dashboard: api.bugsnag.com for app.bugsnag.com, or api.bugsnag.smartbear.com for app.bugsnag.smartbear.com.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: requireId(ctx.input.token, 'Personal auth token'),
          apiEndpoint: ctx.input.apiEndpoint
        }
      };
    },

    getProfile: async (ctx: { output: BugsnagAuth }) => {
      const organizations = await new BugsnagClient(ctx.output).listOrganizations({
        perPage: 1
      });
      const organization = organizations[0];
      if (!organization?.id)
        throw createApiServiceError(
          'The token has no accessible Bugsnag organization. Check the token and account endpoint.',
          { reason: 'authentication_failed' }
        );

      return {
        profile: {
          id: organization.id,
          name: organization.name
        }
      };
    }
  });
