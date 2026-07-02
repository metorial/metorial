import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      studioId: z.string().optional(),
      secretKey: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key (Public API V2)',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('API Key from Settings > API Integrations > New API Key')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'New Lead API (Legacy)',
    key: 'new_lead_api',

    inputSchema: z.object({
      secretKey: z.string().describe('Secret Key from Settings > New Lead API'),
      studioId: z.string().describe('Studio ID from Settings > New Lead API')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.secretKey,
          studioId: ctx.input.studioId,
          secretKey: ctx.input.secretKey
        }
      };
    }
  });
