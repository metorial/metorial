import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('API key or user token for authenticating with noCRM.io')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Admin API key generated from Admin Panel > Integrations > API > API Keys')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Email & Password',
    key: 'email_password',
    inputSchema: z.object({
      subdomain: z.string().describe('Your noCRM.io account subdomain'),
      email: z.string().describe('Your noCRM.io account email'),
      password: z.string().describe('Your noCRM.io account password')
    }),
    getOutput: async ctx => {
      let ax = createAxios({
        baseURL: `https://${ctx.input.subdomain}.nocrm.io/api/v2`
      });

      let response = await ax.get('/auth/login', {
        auth: {
          username: ctx.input.email,
          password: ctx.input.password
        }
      });

      return {
        output: {
          token: response.data.token
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string };
      input: { subdomain: string; email: string; password: string };
    }) => {
      let ax = createAxios({
        baseURL: `https://${ctx.input.subdomain}.nocrm.io/api/v2`,
        headers: {
          'X-USER-TOKEN': ctx.output.token
        }
      });

      let response = await ax.get('/users/self');

      return {
        profile: {
          id: String(response.data.id),
          email: response.data.email,
          name: `${response.data.firstname} ${response.data.lastname}`
        }
      };
    }
  });
