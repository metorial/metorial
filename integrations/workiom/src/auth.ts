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
      token: z.string().describe('Your Workiom API Key. Found in Account Settings.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let http = createAxios({ baseURL: 'https://api.workiom.com' });
      await http.get('/api/services/app/Apps/GetAll', {
        headers: { 'X-Api-Key': ctx.output.token }
      });
      return {
        profile: {
          name: 'Workiom User'
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Username & Password',
    key: 'username_password',
    inputSchema: z.object({
      username: z.string().describe('Your Workiom username or email'),
      password: z.string().describe('Your Workiom password')
    }),
    getOutput: async ctx => {
      let http = createAxios({ baseURL: 'https://api.workiom.com' });
      let response = await http.post('/api/TokenAuth/Authenticate', {
        userNameOrEmailAddress: ctx.input.username,
        password: ctx.input.password
      });
      let token = response.data?.result?.accessToken;
      if (!token) {
        throw new Error('Failed to authenticate. Please check your credentials.');
      }
      return {
        output: {
          token
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string };
      input: { username: string; password: string };
    }) => {
      let http = createAxios({ baseURL: 'https://api.workiom.com' });
      await http.get('/api/services/app/Apps/GetAll', {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });
      return {
        profile: {
          name: ctx.input.username
        }
      };
    }
  });
