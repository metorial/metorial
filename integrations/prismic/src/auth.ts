import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Content API access token for reading published content'),
      writeToken: z
        .string()
        .optional()
        .describe(
          'Write API bearer token for managing custom types, assets, and shared slices'
        ),
      migrationToken: z
        .string()
        .optional()
        .describe('Migration API token for creating and updating documents')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Content API Token',
    key: 'content_api_token',
    inputSchema: z.object({
      contentApiToken: z
        .string()
        .describe('Content API access token (read-only) from Settings > API & Security')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.contentApiToken
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Full Access Tokens',
    key: 'full_access_tokens',
    inputSchema: z.object({
      contentApiToken: z
        .string()
        .describe('Content API access token (read-only) from Settings > API & Security'),
      writeApiToken: z
        .string()
        .optional()
        .describe('Write API bearer token from Settings > API & Security > Write APIs tab'),
      migrationApiToken: z
        .string()
        .optional()
        .describe('Migration API token from Settings > API & Security')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.contentApiToken,
          writeToken: ctx.input.writeApiToken,
          migrationToken: ctx.input.migrationApiToken
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Email & Password',
    key: 'email_password',
    inputSchema: z.object({
      email: z.string().describe('Prismic account email address'),
      password: z.string().describe('Prismic account password'),
      writeApiToken: z
        .string()
        .optional()
        .describe('Write API bearer token from Settings > API & Security > Write APIs tab'),
      migrationApiToken: z
        .string()
        .optional()
        .describe('Migration API token from Settings > API & Security')
    }),
    getOutput: async ctx => {
      let authAxios = createAxios({
        baseURL: 'https://auth.prismic.io'
      });

      let response = await authAxios.post(
        '/login',
        {
          email: ctx.input.email,
          password: ctx.input.password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        output: {
          token: response.data as string,
          writeToken: ctx.input.writeApiToken,
          migrationToken: ctx.input.migrationApiToken
        }
      };
    }
  });
