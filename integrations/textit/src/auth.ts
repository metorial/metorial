import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, requireText } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your TextIt API token, available from your workspace API documentation page (https://textit.com/api/v2/).'
        )
    }),
    getOutput: async ctx => {
      requireText(ctx.input.token, 'API token');
      return { output: { token: ctx.input.token } };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      const workspace = await new Client(ctx.output.token).getWorkspaceIdentity();
      return { profile: { id: workspace.uuid, name: workspace.name } };
    }
  });
