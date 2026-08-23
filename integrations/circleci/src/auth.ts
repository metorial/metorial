import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

let getProfile = async (token: string) => {
  let user = await new Client({ token }).getCurrentUser();

  return {
    profile: {
      id: user.id,
      name: user.name,
      metadata: {
        login: user.login
      }
    }
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal API Token',
    key: 'personal_api_token',

    inputSchema: z.object({
      token: z.string().describe('CircleCI Personal API Token')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) =>
      getProfile(ctx.output.token)
  });
