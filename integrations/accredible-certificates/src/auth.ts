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
        .describe('Your Accredible API key. Found in Dashboard > Settings > API Integrations.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let ax = createAxios({
        baseURL: 'https://api.accredible.com'
      });

      let response = await ax.get('/v1/issuer', {
        headers: {
          Authorization: `Token token=${ctx.output.token}`,
          'Content-Type': 'application/json'
        }
      });

      let issuer = response.data?.issuer;

      return {
        profile: {
          id: issuer?.id?.toString(),
          name: issuer?.name,
          email: issuer?.email
        }
      };
    }
  });
