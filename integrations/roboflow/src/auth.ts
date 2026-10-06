import { SlateAuth } from 'slates';
import { z } from 'zod';
import { RoboflowClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      workspaceId: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .min(1)
        .describe(
          'Roboflow Private API Key. Found under Settings > API Keys in your Roboflow dashboard.'
        )
    }),

    getOutput: async ctx => {
      let workspaceId = await new RoboflowClient({
        token: ctx.input.token
      }).getAuthenticatedWorkspace();
      return {
        output: {
          token: ctx.input.token,
          workspaceId
        }
      };
    },

    getProfile: async (ctx: { output: { token: string; workspaceId?: string } }) => {
      let workspaceId =
        ctx.output.workspaceId ??
        (await new RoboflowClient(ctx.output).getAuthenticatedWorkspace());

      return {
        profile: {
          id: workspaceId,
          name: workspaceId
        }
      };
    }
  });
