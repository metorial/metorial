import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { mapMember } from './lib/member';

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
      apiKey: z
        .string()
        .describe(
          'Your Route4Me API key. Found under Settings > Organization Settings > Integrations > API Key.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let client = new Client({ token: ctx.output.token });
      let user = mapMember(await client.getUser());

      return {
        profile: {
          id: user.memberId.toString(),
          email: user.memberEmail,
          name:
            [user.memberFirstName, user.memberLastName].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
