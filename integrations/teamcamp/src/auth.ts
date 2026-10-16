import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { requiredString, requireRecord } from './lib/response';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
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
          'Your Teamcamp API key. Generate one from your Teamcamp Account Settings at https://dash.teamcamp.app/settings/apikey'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let workspace = requireRecord(await new Client(ctx.output).verify());
      return {
        profile: {
          id: requiredString(workspace.workspaceId, 'workspaceId'),
          name: requiredString(workspace.workspaceName, 'workspaceName')
        }
      };
    }
  });
