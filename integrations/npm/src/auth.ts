import { SlateAuth } from 'slates';
import { z } from 'zod';
import { NpmRegistryClient } from './lib/client';
import { record, text } from './lib/response';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addNone()
  .addTokenAuth({
    type: 'auth.token',
    name: 'npm Access Token',
    key: 'npm_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'An npm access token (session token or granular access token). Used for authenticated operations like token management and accessing private packages. Token creation/listing requires a session token; governance writes reject bypass-2FA tokens.'
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
      let client = new NpmRegistryClient({ token: ctx.output.token });
      let user = record(await client.getUserProfile(), 'user profile');

      return {
        profile: {
          name: text(user.name, 'username'),
          email: text(user.email, 'profile email')
        }
      };
    }
  });
