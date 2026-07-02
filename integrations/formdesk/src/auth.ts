import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      host: z.string(),
      domain: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z.string().describe('The API key from your Formdesk User Management settings.'),
      domain: z
        .string()
        .describe(
          'The unique account name (folder of forms) found in your Formdesk account settings.'
        )
    }),

    getOutput: async ctx => {
      let http = createAxios({
        baseURL: `https://www.formdesk.com/api/rest/v1/${ctx.input.domain}`,
        headers: {
          Authorization: `Bearer ${ctx.input.token}`
        }
      });

      let response = await http.get('/connect');
      let data = response.data;
      let host = data.host || 'www.formdesk.com';
      let domain = data.domain || ctx.input.domain;

      return {
        output: {
          token: ctx.input.token,
          host,
          domain
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; host: string; domain: string };
      input: { token: string; domain: string };
    }) => {
      return {
        profile: {
          name: ctx.output.domain,
          id: ctx.output.domain
        }
      };
    }
  });
