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
        .describe('ProxiedMail API token. Obtain from https://proxiedmail.com/en/settings')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Email & Password',
    key: 'email_password',
    inputSchema: z.object({
      email: z.string().describe('Your ProxiedMail account email address'),
      password: z.string().describe('Your ProxiedMail account password')
    }),
    getOutput: async ctx => {
      let axios = createAxios({
        baseURL: 'https://proxiedmail.com/api/v1',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      });

      let loginResponse = await axios.post('/auth', {
        data: {
          type: 'auth-request',
          attributes: {
            username: ctx.input.email,
            password: ctx.input.password
          }
        }
      });

      let bearerToken = loginResponse.data.data.attributes.token;

      let tokenResponse = await axios.get('/api-token', {
        headers: {
          Authorization: `Bearer ${bearerToken}`
        }
      });

      let apiToken = tokenResponse.data.token;

      return {
        output: {
          token: apiToken
        }
      };
    }
  });
