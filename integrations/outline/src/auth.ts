import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { identifier, instanceUrl, requireValue } from './lib/validation';

export const auth = SlateAuth.create()
  .output(z.object({ token: z.string(), baseUrl: z.string().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Outline API token from Settings → API. Grant only the read/write permissions needed for your tools.'
        ),
      baseUrl: z
        .string()
        .default('https://app.getoutline.com')
        .describe(
          'Exact HTTPS Outline instance URL. Set your self-hosted domain here; omit the /api suffix.'
        )
    }),
    getOutput: async ctx => ({
      output: {
        token: identifier(ctx.input.token, 'API token'),
        baseUrl: instanceUrl(ctx.input.baseUrl)
      }
    }),
    getProfile: async (ctx: { output: { token: string; baseUrl?: string } }) => {
      requireValue(
        ctx.output.baseUrl,
        'Reconnect API Token authentication with the exact Outline instance URL before looking up your profile.'
      );
      const { user, team } = await new Client(ctx.output).getIdentity();
      return {
        profile: {
          id: user.id,
          name: user.name,
          email: user.email ?? undefined,
          imageUrl: user.avatarUrl ?? undefined,
          teamName: team.name,
          teamId: team.id
        }
      };
    }
  });
