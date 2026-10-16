import { SlateAuth } from 'slates';
import { z } from 'zod';
import { BeaconchainClient } from './lib/client';

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
    getProfile: async (ctx: { output: { token: string } }) => {
      let client = new BeaconchainClient({ token: ctx.output.token, chain: 'mainnet' });
      await client.getChainState();

      return {
        profile: {
          name: 'Beaconcha.in User'
        }
      };
    }
  });
