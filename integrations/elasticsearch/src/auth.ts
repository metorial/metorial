import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { elasticsearchApiError, mapElasticsearchAxiosError } from './lib/errors';

let createAuthAxios = (baseUrl: string) =>
  createAxios({
    baseURL: baseUrl,
    errorMapping: {
      mapAxiosError: mapElasticsearchAxiosError
    }
  });

let loadProfile = async (baseUrl: string, authHeader: string) => {
  let ax = createAuthAxios(baseUrl);

  try {
    return await ax.get('/_security/_authenticate', {
      headers: {
        Authorization: authHeader
      }
    });
  } catch (error) {
    throw elasticsearchApiError(error, 'load profile');
  }
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      baseUrl: z.string(),
      authHeader: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Basic Authentication',
    key: 'basic_auth',

    inputSchema: z.object({
      elasticsearchUrl: z
        .string()
        .describe(
          'Base URL of your Elasticsearch cluster (e.g., https://my-cluster.es.cloud:9243)'
        ),
      username: z.string().describe('Elasticsearch username'),
      password: z.string().describe('Elasticsearch password')
    }),

    getOutput: async ctx => {
      let credentials = btoa(`${ctx.input.username}:${ctx.input.password}`);
      let baseUrl = ctx.input.elasticsearchUrl.replace(/\/+$/, '');

      let ax = createAuthAxios(baseUrl);
      try {
        await ax.get('/', {
          headers: {
            Authorization: `Basic ${credentials}`
          }
        });
      } catch (error) {
        throw elasticsearchApiError(error, 'basic authentication');
      }

      return {
        output: {
          baseUrl,
          authHeader: `Basic ${credentials}`
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await loadProfile(ctx.output.baseUrl, ctx.output.authHeader);

      return {
        profile: {
          id: response.data.username,
          name: response.data.full_name || response.data.username,
          email: response.data.email
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      elasticsearchUrl: z
        .string()
        .describe(
          'Base URL of your Elasticsearch cluster (e.g., https://my-cluster.es.cloud:9243)'
        ),
      token: z
        .string()
        .describe(
          'Base64-encoded API key (the "encoded" value returned when the API key was created)'
        )
    }),

    getOutput: async ctx => {
      let baseUrl = ctx.input.elasticsearchUrl.replace(/\/+$/, '');

      let ax = createAuthAxios(baseUrl);
      try {
        await ax.get('/', {
          headers: {
            Authorization: `ApiKey ${ctx.input.token}`
          }
        });
      } catch (error) {
        throw elasticsearchApiError(error, 'API key authentication');
      }

      return {
        output: {
          baseUrl,
          authHeader: `ApiKey ${ctx.input.token}`
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await loadProfile(ctx.output.baseUrl, ctx.output.authHeader);

      return {
        profile: {
          id: response.data.username,
          name: response.data.full_name || response.data.username,
          email: response.data.email
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Bearer Token',
    key: 'bearer_token',

    inputSchema: z.object({
      elasticsearchUrl: z
        .string()
        .describe(
          'Base URL of your Elasticsearch cluster (e.g., https://my-cluster.es.cloud:9243)'
        ),
      token: z
        .string()
        .describe('OAuth2 access token obtained from the /_security/oauth2/token endpoint')
    }),

    getOutput: async ctx => {
      let baseUrl = ctx.input.elasticsearchUrl.replace(/\/+$/, '');

      let ax = createAuthAxios(baseUrl);
      try {
        await ax.get('/', {
          headers: {
            Authorization: `Bearer ${ctx.input.token}`
          }
        });
      } catch (error) {
        throw elasticsearchApiError(error, 'bearer token authentication');
      }

      return {
        output: {
          baseUrl,
          authHeader: `Bearer ${ctx.input.token}`
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await loadProfile(ctx.output.baseUrl, ctx.output.authHeader);

      return {
        profile: {
          id: response.data.username,
          name: response.data.full_name || response.data.username,
          email: response.data.email
        }
      };
    }
  });
