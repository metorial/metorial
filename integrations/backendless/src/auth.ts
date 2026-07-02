import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      applicationId: z.string().describe('Backendless Application ID'),
      token: z.string().describe('Backendless REST API Key')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      applicationId: z
        .string()
        .describe('Application ID from Backendless Console (Manage > App Settings)'),
      restApiKey: z
        .string()
        .describe('REST API Key from Backendless Console (Manage > App Settings)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          applicationId: ctx.input.applicationId,
          token: ctx.input.restApiKey
        }
      };
    }
  });
