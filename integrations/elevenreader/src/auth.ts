import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

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
        .describe('ElevenLabs API key from https://elevenlabs.io/app/developers/api-keys')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let axios = createAxios({
        baseURL: 'https://api.elevenlabs.io'
      });

      let response = await axios.get('/v1/user', {
        headers: {
          'xi-api-key': ctx.output.token
        }
      });

      let user = response.data;
      return {
        profile: {
          id: user.user_id,
          name: user.first_name || undefined,
          subscription: user.subscription?.tier
        }
      };
    }
  });
