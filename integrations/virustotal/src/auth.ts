import { createHash } from 'node:crypto';
import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, type VirusTotalAuth } from './lib/client';
import { credential, opaqueId } from './lib/contracts';

export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      username: z.string().optional(),
      userId: z.string().optional()
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
          'Your VirusTotal API key from account settings. Endpoint privileges and licensed quota apply.'
        ),
      username: z
        .string()
        .optional()
        .describe(
          'Your exact VirusTotal account username, used to verify account context without placing the API key in a URL. Optional for existing report workflows.'
        )
    }),
    getOutput: async ctx => {
      const token = credential(ctx.input.token),
        username = ctx.input.username;
      if (username === undefined) return { output: { token } };
      opaqueId(username, 'Username');
      const user = await new Client({ token, username }).getConnectionContext();
      return { output: { token, username, userId: user.id } };
    },
    getProfile: async (ctx: { output: VirusTotalAuth }) => {
      if (!ctx.output.username)
        return {
          profile: {
            id: `api-key-${createHash('sha256').update(ctx.output.token).digest('hex').slice(0, 24)}`,
            name: 'VirusTotal API key (user not verified)'
          }
        };
      const user = await new Client(ctx.output).getConnectionContext();
      return {
        profile: {
          id: user.id,
          name:
            [user.attributes?.first_name, user.attributes?.last_name]
              .filter(Boolean)
              .join(' ') || user.id,
          email: user.attributes?.email
        }
      };
    }
  });
