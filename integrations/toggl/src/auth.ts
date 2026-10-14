import { SlateAuth } from 'slates';
import { z } from 'zod';
import { TogglClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string(), defaultWorkspaceId: z.number().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Toggl Track API token. Found under "My Profile" in your Toggl account.')
    }),
    getOutput: async ctx => {
      let user = await new TogglClient(ctx.input.token).getMe();
      return {
        output: {
          token: ctx.input.token,
          defaultWorkspaceId: user.default_workspace_id ?? user.default_wid ?? undefined
        }
      };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      let user = await new TogglClient(ctx.output.token).getMe();
      return {
        profile: {
          id: String(user.id),
          email: user.email ?? undefined,
          name: user.fullname ?? user.email,
          imageUrl: user.image_url ?? undefined
        }
      };
    }
  });
