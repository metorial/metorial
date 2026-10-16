import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

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
      token: z.string().describe('Plain API key (created under Settings > Machine Users)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      let identity = await new Client({ token: ctx.output.token }).getCurrentIdentity();
      return {
        profile: {
          id: identity.myMachineUser.id,
          name: `${identity.myMachineUser.fullName} (${identity.myWorkspace.name})`
        }
      };
    }
  });
