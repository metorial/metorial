import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('OneSignal App API Key or Organization API Key'),
      organizationToken: z
        .string()
        .optional()
        .describe('Organization API Key for app management and discovery')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'App API Key for messaging and audience tools, or Organization API Key for app tools'
        ),
      organizationToken: z
        .string()
        .optional()
        .describe(
          'Optional Organization API Key for list_apps and app management when token is an App API Key'
        )
    }),
    getOutput: async ctx => {
      if (
        !ctx.input.token.trim() ||
        (ctx.input.organizationToken !== undefined && !ctx.input.organizationToken.trim())
      ) {
        throw createApiServiceError('Provide a non-empty OneSignal API key.');
      }
      return {
        output: {
          token: ctx.input.token,
          organizationToken: ctx.input.organizationToken
        }
      };
    }
  });
