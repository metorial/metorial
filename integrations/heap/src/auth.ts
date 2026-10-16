import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      appId: z
        .string()
        .describe(
          'Heap App ID (Environment ID); deletion requires the Main Production environment ID'
        ),
      token: z
        .string()
        .describe('Heap API Key used for generating auth tokens for deletion operations')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'App ID & API Key',
    key: 'app_id_api_key',

    inputSchema: z.object({
      appId: z
        .string()
        .describe(
          'Your Heap App ID (Environment ID). Use the Main Production environment ID for deletion. Find it under Account > Manage > Privacy & Security.'
        ),
      apiKey: z
        .string()
        .describe('Your Heap API Key. Found in the same location as the App ID.')
    }),

    getOutput: async ctx => {
      if (!ctx.input.appId.trim() || !ctx.input.apiKey.trim()) {
        throw createApiServiceError('Provide a nonempty Heap App ID and API Key.');
      }
      return {
        output: {
          appId: ctx.input.appId,
          token: ctx.input.apiKey
        }
      };
    }
  });
