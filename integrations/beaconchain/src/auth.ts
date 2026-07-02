import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Beaconcha.in API key')
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
          'Your Beaconcha.in API key. Obtain one at https://beaconcha.in/user/api-key-management'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: any) => {
      let ax = createAxios({
        baseURL: 'https://beaconcha.in',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Content-Type': 'application/json'
        }
      });

      let _response = await ax.post('/api/v2/ethereum/state', {
        chain: 'mainnet'
      });

      return {
        profile: {
          name: 'Beaconcha.in User'
        }
      };
    }
  });
