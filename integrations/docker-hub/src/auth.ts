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
    name: 'Username & Password',
    key: 'credentials',

    inputSchema: z.object({
      username: z.string().describe('Docker Hub username'),
      password: z.string().describe('Docker Hub password')
    }),

    getOutput: async ctx => {
      let http = createAxios({ baseURL: 'https://hub.docker.com' });

      let response = await http.post('/v2/users/login', {
        username: ctx.input.username,
        password: ctx.input.password
      });

      return {
        output: {
          token: response.data.token as string,
          username: ctx.input.username
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; username: string };
      input: { username: string; password: string };
    }) => {
      let http = createAxios({ baseURL: 'https://hub.docker.com' });

      let response = await http.get(`/v2/user/`, {
        headers: {
          Authorization: `JWT ${ctx.output.token}`
        }
      });

      return {
        profile: {
          id: response.data.id,
          name: response.data.full_name || response.data.username,
          email: response.data.email,
          imageUrl: response.data.gravatar_url
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'pat',

    inputSchema: z.object({
      username: z.string().describe('Docker Hub username'),
      token: z.string().describe('Docker Hub Personal Access Token (PAT)')
    }),

    getOutput: async ctx => {
      let http = createAxios({ baseURL: 'https://hub.docker.com' });

      let response = await http.post('/v2/users/login', {
        username: ctx.input.username,
        password: ctx.input.token
      });

      return {
        output: {
          token: response.data.token as string,
          username: ctx.input.username
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; username: string };
      input: { username: string; token: string };
    }) => {
      let http = createAxios({ baseURL: 'https://hub.docker.com' });

      let response = await http.get(`/v2/user/`, {
        headers: {
          Authorization: `JWT ${ctx.output.token}`
        }
      });

      return {
        profile: {
          id: response.data.id,
          name: response.data.full_name || response.data.username,
          email: response.data.email,
          imageUrl: response.data.gravatar_url
        }
      };
    }
  });
