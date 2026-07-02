import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      serviceAccountUsername: z
        .string()
        .optional()
        .describe('Service account username for query/export APIs'),
      serviceAccountSecret: z
        .string()
        .optional()
        .describe('Service account secret for query/export APIs'),
      projectToken: z
        .string()
        .optional()
        .describe('Project token for ingestion APIs (track, engage, groups)')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Service Account',
    key: 'service_account',

    inputSchema: z.object({
      serviceAccountUsername: z.string().describe('Service account username'),
      serviceAccountSecret: z.string().describe('Service account secret'),
      projectToken: z
        .string()
        .optional()
        .describe(
          'Project token for ingestion APIs (optional, only needed for track/engage/groups)'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          serviceAccountUsername: ctx.input.serviceAccountUsername,
          serviceAccountSecret: ctx.input.serviceAccountSecret,
          projectToken: ctx.input.projectToken
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Project Token',
    key: 'project_token',

    inputSchema: z.object({
      token: z.string().describe('Mixpanel project token for ingestion APIs')
    }),

    getOutput: async ctx => {
      return {
        output: {
          projectToken: ctx.input.token
        }
      };
    }
  });
