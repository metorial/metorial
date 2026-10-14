import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { PublicApiClient } from './lib/public-api-client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe(
          'Base64-encoded Basic Auth token (username:password) for Web Scraping API, or API key for Public API'
        ),
      authMethod: z
        .enum(['basic', 'api_key'])
        .describe('Which authentication method is being used')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Basic Auth (Web Scraping API)',
    key: 'basic_auth',
    inputSchema: z.object({
      username: z.string().describe('Web Scraping API username from the Decodo dashboard'),
      password: z.string().describe('Web Scraping API password from the Decodo dashboard')
    }),
    getOutput: async (ctx: { input: { username: string; password: string } }) => {
      if (
        !ctx.input.username.trim() ||
        !ctx.input.password ||
        ctx.input.username.includes(':')
      ) {
        throw createApiServiceError(
          'Provide a non-empty Web Scraping API username and password; the username cannot contain a colon.'
        );
      }
      let encoded = Buffer.from(
        `${ctx.input.username}:${ctx.input.password}`,
        'utf8'
      ).toString('base64');
      return {
        output: {
          token: encoded,
          authMethod: 'basic' as const
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; authMethod: string };
      input: { username: string; password: string };
    }) => {
      let username = ctx.input.username;
      return {
        profile: {
          name: username
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key (Public API)',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe('API key from the Decodo dashboard (Account Settings > API Keys)')
    }),
    getOutput: async (ctx: { input: { token: string } }) => {
      return {
        output: {
          token: ctx.input.token,
          authMethod: 'api_key' as const
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; authMethod: string };
      input: { token: string };
    }) => {
      let subscriptions = await new PublicApiClient(
        ctx.output.token,
        ctx.output.authMethod
      ).getSubscriptions();
      return { profile: { subscriptions } };
    }
  });
