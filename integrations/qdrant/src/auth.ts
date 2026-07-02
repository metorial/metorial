import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('API key for Qdrant database operations'),
      managementToken: z
        .string()
        .optional()
        .describe('Management API key for Qdrant Cloud operations')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Database API Key',
    key: 'database_api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('Qdrant database API key for vector operations'),
      managementKey: z
        .string()
        .optional()
        .describe('Qdrant Cloud management key for cluster operations (optional)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          managementToken: ctx.input.managementKey
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Cloud Management Key',
    key: 'cloud_management_key',
    inputSchema: z.object({
      managementKey: z.string().describe('Qdrant Cloud management API key'),
      apiKey: z
        .string()
        .optional()
        .describe('Qdrant database API key for vector operations (optional)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey ?? '',
          managementToken: ctx.input.managementKey
        }
      };
    }
  });
