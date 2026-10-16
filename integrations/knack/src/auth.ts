import { SlateAuth } from 'slates';
import { z } from 'zod';

let applicationId = z
  .string()
  .optional()
  .describe(
    'Knack Application ID from Builder > Settings > API & Code. Supply it for new connections; existing connections may retain their saved application ID.'
  );

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      applicationId,
      authMode: z
        .enum(['api_key', 'view_based'])
        .describe('Which authentication mode is in use')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      applicationId,
      apiKey: z
        .string()
        .describe('Your Knack REST API Key, found in Builder settings under API & Code')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authMode: 'api_key' as const,
          ...(ctx.input.applicationId === undefined
            ? {}
            : { applicationId: ctx.input.applicationId })
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'User Token (View-Based)',
    key: 'view_based',
    inputSchema: z.object({
      applicationId,
      userToken: z
        .string()
        .describe('A user token obtained via remote login, used for view-based API requests')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.userToken,
          authMode: 'view_based' as const,
          ...(ctx.input.applicationId === undefined
            ? {}
            : { applicationId: ctx.input.applicationId })
        }
      };
    }
  });
