import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, normalizeBaseUrl } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      baseUrl: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Personal Access Token generated from Your Account > Access Tokens in Penpot'
        ),
      baseUrl: z
        .string()
        .default('https://design.penpot.app')
        .describe(
          'Penpot instance URL. Use https://design.penpot.app for the hosted service or your self-hosted instance URL.'
        )
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.token,
        baseUrl: normalizeBaseUrl(ctx.input.baseUrl)
      }
    }),
    getProfile: async (ctx: {
      output: { token: string; baseUrl?: string };
      input: { token: string; baseUrl?: string };
    }) => {
      let client = new Client({
        baseUrl: ctx.output.baseUrl ?? ctx.input.baseUrl ?? 'https://design.penpot.app',
        token: ctx.output.token
      });
      let data = await client.getProfile();
      return {
        profile: {
          id: data.id,
          email: data.email,
          name: data.fullname
        }
      };
    }
  });
