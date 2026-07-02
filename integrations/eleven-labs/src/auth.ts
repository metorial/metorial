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
      apiKey: z
        .string()
        .describe(
          'ElevenLabs API key. Find it under Developers > API Keys in your ElevenLabs dashboard.'
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
      let client = createAxios({
        baseURL: 'https://api.elevenlabs.io',
        headers: {
          'xi-api-key': ctx.output.token
        }
      });

      let response = await client.get('/v1/user');
      let user = response.data as {
        user_id?: string;
        first_name?: string;
        subscription?: {
          tier?: string;
        };
      };

      return {
        profile: {
          id: user.user_id,
          name: user.first_name,
          tier: user.subscription?.tier
        }
      };
    }
  });
