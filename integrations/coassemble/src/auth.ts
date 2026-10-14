import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      userId: z.string().optional(),
      authScheme: z.enum(['bearer', 'coassemble', 'workspace'])
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Workspace API Key',
    key: 'workspace_api_key',
    inputSchema: z.object({
      token: z.string().describe('Full workspace API key: COASSEMBLE:<workspaceId>:<secret>')
    }),
    getOutput: async ctx => {
      if (!/^COASSEMBLE:[^:\s]+:[^\s]+$/.test(ctx.input.token)) {
        throw createApiServiceError(
          'Enter the full workspace API key from your Coassemble API settings, including the COASSEMBLE: prefix. Do not add a Bearer prefix.'
        );
      }

      return {
        output: {
          token: ctx.input.token,
          userId: undefined,
          authScheme: 'workspace' as const
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bearer Token',
    key: 'bearer_token',
    inputSchema: z.object({
      token: z.string().describe('Coassemble API bearer token')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          userId: undefined,
          authScheme: 'bearer' as const
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      userId: z.string().describe('Your Coassemble User ID'),
      token: z.string().describe('Your Coassemble API Key')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          userId: ctx.input.userId,
          authScheme: 'coassemble' as const
        }
      };
    }
  });
