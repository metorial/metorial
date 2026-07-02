import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { createDockerHubBearerToken } from './lib/client';
import { dockerHubApiError } from './lib/errors';

let getProfile = async (ctx: {
  output: { token: string; username: string };
  input: Record<string, unknown>;
}) => {
  let http = createAxios({ baseURL: 'https://hub.docker.com' });

  try {
    let response = await http.get(`/v2/user/`, {
      headers: {
        Authorization: `Bearer ${ctx.output.token}`
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
  } catch (error) {
    throw dockerHubApiError(error, 'profile request');
  }
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      username: z.string(),
      identifier: z
        .string()
        .optional()
        .describe('Docker Hub username or organization identifier used for token renewal.'),
      secret: z
        .string()
        .optional()
        .describe('Docker Hub password, personal access token, or organization access token.')
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
      let token = await createDockerHubBearerToken({
        identifier: ctx.input.username,
        secret: ctx.input.password
      });

      return {
        output: {
          token,
          username: ctx.input.username,
          identifier: ctx.input.username,
          secret: ctx.input.password
        }
      };
    },

    getProfile
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
      let token = await createDockerHubBearerToken({
        identifier: ctx.input.username,
        secret: ctx.input.token
      });

      return {
        output: {
          token,
          username: ctx.input.username,
          identifier: ctx.input.username,
          secret: ctx.input.token
        }
      };
    },

    getProfile
  });
