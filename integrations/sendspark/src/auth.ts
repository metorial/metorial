import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      apiKey: z.string().describe('Sendspark API Key (x-api-key)'),
      apiSecret: z.string().describe('Sendspark API Secret (x-api-secret)'),
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace identified by the API credentials')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Credentials',
    key: 'api_credentials',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your Sendspark API Key, found in the API Credentials tab at https://sendspark.com/settings/api-credentials'
        ),
      apiSecret: z
        .string()
        .describe(
          'Your Sendspark API Secret, found in the API Credentials tab at https://sendspark.com/settings/api-credentials'
        )
    }),

    getOutput: async ctx => {
      let workspace = await new Client(ctx.input).getWorkspace();
      return {
        output: {
          apiKey: ctx.input.apiKey,
          apiSecret: ctx.input.apiSecret,
          workspaceId: workspace.workspaceId
        }
      };
    },

    getProfile: async (ctx: {
      output: { apiKey: string; apiSecret: string; workspaceId?: string };
      input: { apiKey: string; apiSecret: string };
    }) => {
      let workspace = await new Client(ctx.output).getWorkspace();

      return {
        profile: {
          workspaceId: workspace.workspaceId
        }
      };
    }
  });
