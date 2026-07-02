import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      username: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      username: z.string().describe('Your Nutshell user email address'),
      token: z.string().describe('Your Nutshell API key (generated from Setup > API Keys)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          username: ctx.input.username
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; username: string };
      input: { username: string; token: string };
    }) => {
      let axios = createAxios({
        baseURL: 'https://app.nutshell.com/api/v1/json'
      });

      let response = await axios.post(
        '',
        {
          id: 'auth-profile',
          method: 'findUsers',
          params: {}
        },
        {
          auth: {
            username: ctx.output.username,
            password: ctx.output.token
          }
        }
      );

      let users = response.data?.result ?? [];
      let currentUser = users.find((u: any) => {
        let emails = u.email || u.emails || [];
        return emails.some((e: any) => {
          let emailStr = typeof e === 'string' ? e : e?.value || e?.address || '';
          return emailStr.toLowerCase() === ctx.output.username.toLowerCase();
        });
      });

      if (currentUser) {
        return {
          profile: {
            id: String(currentUser.id),
            email: ctx.output.username,
            name: currentUser.name
          }
        };
      }

      return {
        profile: {
          email: ctx.output.username
        }
      };
    }
  });
