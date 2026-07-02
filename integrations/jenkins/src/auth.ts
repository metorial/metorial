import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      username: z.string(),
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'Username & API Token',
    key: 'api_token',

    inputSchema: z.object({
      username: z.string().describe('Jenkins username'),
      token: z.string().describe('Jenkins API token (found at $JENKINS_URL/me/configure)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          username: ctx.input.username,
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: {
      output: { username: string; token: string };
      input: { username: string; token: string };
    }) => {
      return {
        profile: {
          id: ctx.output.username,
          name: ctx.output.username
        }
      };
    }
  });
