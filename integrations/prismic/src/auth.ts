import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { invalid, protect, token, upstream, validText } from './lib/contracts';

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
      if (ctx.input.contentApiToken) token(ctx.input.contentApiToken);
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
      if (ctx.input.contentApiToken) token(ctx.input.contentApiToken);
      if (ctx.input.writeApiToken !== undefined) token(ctx.input.writeApiToken);
      if (ctx.input.migrationApiToken !== undefined) token(ctx.input.migrationApiToken);
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
    name: 'Email & Password (Legacy)',
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
      validText(ctx.input.email, 'email address');
      validText(ctx.input.password, 'password');
      if (!z.email().safeParse(ctx.input.email).success)
        invalid('Provide a valid account email address.');
      if (ctx.input.writeApiToken !== undefined) token(ctx.input.writeApiToken);
      if (ctx.input.migrationApiToken !== undefined) token(ctx.input.migrationApiToken);
      let authAxios = createAxios({
        baseURL: 'https://auth.prismic.io',
        timeout: 30000,
        maxRedirects: 0
      });
      let session: unknown;
      try {
        const response = await authAxios.post<unknown>(
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
        session = response.data;
      } catch (error) {
        throw upstream(error);
      }
      protect(session, [
        ctx.input.password,
        ctx.input.writeApiToken ?? '',
        ctx.input.migrationApiToken ?? ''
      ]);
      if (typeof session !== 'string')
        invalid(
          'The legacy login did not return a session token. Use Content API Token or Full Access Tokens with credentials generated in repository settings.'
        );
      token(session);

      return {
        output: {
          token: session,
          writeToken: ctx.input.writeApiToken,
          migrationToken: ctx.input.migrationApiToken
        }
      };
    }
  });
