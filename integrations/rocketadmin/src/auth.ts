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
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Rocketadmin API key generated from Account Settings in the Rocketadmin dashboard'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token?: string }; input: { apiKey: string } }) => {
      let axios = createAxios({
        baseURL: 'https://app.rocketadmin.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Content-Type': 'application/json'
        }
      });
      try {
        await axios.get('/check/apikey');
        return {
          profile: {
            name: 'Rocketadmin User'
          }
        };
      } catch {
        return {
          profile: {
            name: 'Rocketadmin User'
          }
        };
      }
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Email & Password',
    key: 'email_password',
    inputSchema: z.object({
      email: z.string().describe('Rocketadmin account email address'),
      password: z.string().describe('Rocketadmin account password'),
      companyId: z.string().optional().describe('Company ID to log in to (optional)')
    }),
    getOutput: async ctx => {
      let axios = createAxios({
        baseURL: 'https://app.rocketadmin.com',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      let response = await axios.post('/user/login/', {
        email: ctx.input.email,
        password: ctx.input.password,
        ...(ctx.input.companyId ? { companyId: ctx.input.companyId } : {})
      });

      let cookies = response.headers['set-cookie'];
      let token = '';
      if (cookies) {
        let cookieArray = Array.isArray(cookies) ? cookies : [cookies];
        for (let cookie of cookieArray) {
          let match = cookie.match(/rocketadmin_cookie=([^;]+)/);
          if (match?.[1]) {
            token = match[1];
            break;
          }
        }
      }

      if (!token) {
        throw new Error('Failed to extract authentication token from login response');
      }

      return {
        output: {
          token
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string };
      input: { email: string; password: string; companyId?: string };
    }) => {
      let axios = createAxios({
        baseURL: 'https://app.rocketadmin.com',
        headers: {
          Cookie: `rocketadmin_cookie=${ctx.output.token}`,
          'Content-Type': 'application/json'
        }
      });
      try {
        let response = await axios.get('/user/my/');
        let data = response.data;
        return {
          profile: {
            id: data.id,
            email: data.email,
            name: data.name || data.email
          }
        };
      } catch {
        return {
          profile: {
            name: 'Rocketadmin User'
          }
        };
      }
    }
  });
