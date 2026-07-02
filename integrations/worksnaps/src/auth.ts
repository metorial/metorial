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
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Worksnaps API token. Find it under Profile & Settings >> Web Service API.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = createAxios({
        baseURL: 'https://api.worksnaps.com/api',
        auth: {
          username: ctx.output.token,
          password: 'ignored'
        },
        headers: {
          Accept: 'application/xml'
        }
      });

      let response = await client.get('/me.xml');
      let xml = response.data as string;

      let id = extractXmlValue(xml, 'id');
      let email = extractXmlValue(xml, 'email');
      let firstName = extractXmlValue(xml, 'first-name');
      let lastName = extractXmlValue(xml, 'last-name');
      let login = extractXmlValue(xml, 'login');

      let name = [firstName, lastName].filter(Boolean).join(' ') || login || undefined;

      return {
        profile: {
          id,
          email,
          name
        }
      };
    }
  });

let extractXmlValue = (xml: string, tag: string): string | undefined => {
  let regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`);
  let match = xml.match(regex);
  return match?.[1] || undefined;
};
