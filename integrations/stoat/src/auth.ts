import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authType: z.enum(['bot', 'session'])
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bot Token',
    key: 'bot_token',
    inputSchema: z.object({
      token: z.string().describe('Bot token from Revolt bot settings')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          authType: 'bot' as const
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; authType: 'bot' | 'session' };
      input: { token: string };
    }) => {
      let http = createAxios({
        baseURL: 'https://api.revolt.chat'
      });

      let response = await http.get('/users/@me', {
        headers: { 'X-Bot-Token': ctx.output.token }
      });

      let user = response.data;
      return {
        profile: {
          id: user._id,
          name: user.username
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Session Token',
    key: 'session_token',
    inputSchema: z.object({
      token: z.string().describe('Session token from Revolt user authentication')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          authType: 'session' as const
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; authType: 'bot' | 'session' };
      input: { token: string };
    }) => {
      let http = createAxios({
        baseURL: 'https://api.revolt.chat'
      });

      let response = await http.get('/users/@me', {
        headers: { 'X-Session-Token': ctx.output.token }
      });

      let user = response.data;
      return {
        profile: {
          id: user._id,
          name: user.username,
          email: user.email
        }
      };
    }
  });
