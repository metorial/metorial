import { createApiServiceError, createAuthenticatedAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { parseProxiedMailResponse, proxiedMailError } from './lib/errors';

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
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('Enter your ProxiedMail API token from account settings.');
      }
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
      let axios = createAuthenticatedAxios({
        baseURL: 'https://proxiedmail.com/api/v1',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        errorAdapter: proxiedMailError
      });
      axios.interceptors.response.use(response => {
        if (response.data?.data?.type === 'errors') {
          throw proxiedMailError({ response });
        }
        return response;
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

      let bearerToken = parseProxiedMailResponse(
        z.object({ data: z.object({ attributes: z.object({ token: z.string().min(1) }) }) }),
        loginResponse.data
      ).data.attributes.token;

      let tokenResponse = await axios.get('/api-token', {
        headers: {
          Authorization: `Bearer ${bearerToken}`
        }
      });

      let apiToken = parseProxiedMailResponse(
        z.object({ token: z.string().min(1) }),
        tokenResponse.data
      ).token;

      return {
        output: {
          token: apiToken
        }
      };
    }
  });
