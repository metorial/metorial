import { createApiServiceError, createAxios, requestAxiosData, SlateAuth } from 'slates';
import { z } from 'zod';
import { readWorkiomResponse, workiomError } from './lib/client';

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
      let data = await requestAxiosData(
        'validate API key',
        () =>
          http.get('/api/services/app/Apps/GetAll', {
            headers: { 'X-Api-Key': ctx.output.token }
          }),
        workiomError
      );
      readWorkiomResponse(data, 'validate API key');
      return {
        profile: {}
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
      let data = await requestAxiosData(
        'authenticate',
        () =>
          http.post('/api/TokenAuth/Authenticate', {
            userNameOrEmailAddress: ctx.input.username,
            password: ctx.input.password
          }),
        workiomError
      );
      let token = readWorkiomResponse(data, 'authenticate')?.accessToken;
      if (!token) {
        throw createApiServiceError('Failed to authenticate. Please check your credentials.', {
          reason: 'workiom_missing_access_token'
        });
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
      let data = await requestAxiosData(
        'validate access token',
        () =>
          http.get('/api/services/app/Apps/GetAll', {
            headers: { Authorization: `Bearer ${ctx.output.token}` }
          }),
        workiomError
      );
      readWorkiomResponse(data, 'validate access token');
      return {
        profile: {
          name: ctx.input.username
        }
      };
    }
  });
