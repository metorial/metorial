import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      noteStoreUrl: z.string(),
      webApiUrlPrefix: z.string(),
      userId: z.string(),
      shardId: z.string(),
      expiresAt: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'OAuth 1.0a',
    key: 'oauth1',

    inputSchema: z.object({
      consumerKey: z.string().describe('Evernote API consumer key'),
      consumerSecret: z.string().describe('Evernote API consumer secret'),
      oauthToken: z
        .string()
        .optional()
        .describe('Temporary OAuth token (set during auth flow)'),
      oauthTokenSecret: z
        .string()
        .optional()
        .describe('Temporary OAuth token secret (set during auth flow)')
    }),

    getOutput: async _ctx => {
      // This is called after the user provides the input values
      // For OAuth 1.0a, this shouldn't be called directly in the standard flow
      // but the framework requires it. The actual token exchange happens via the OAuth flow.
      // If user already has a token, they can use the developer token auth method instead.
      throw new Error(
        'OAuth 1.0a requires the full OAuth flow. Use the Developer Token auth method for direct token access.'
      );
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Developer Token',
    key: 'developer_token',

    inputSchema: z.object({
      token: z.string().describe('Evernote developer token or OAuth access token'),
      noteStoreUrl: z
        .string()
        .describe(
          'NoteStore URL for your account (e.g. https://www.evernote.com/shard/s1/notestore)'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          noteStoreUrl: ctx.input.noteStoreUrl,
          webApiUrlPrefix: ctx.input.noteStoreUrl.replace(/\/notestore$/, ''),
          userId: '',
          shardId: ''
        }
      };
    },

    getProfile: async (ctx: {
      output: {
        token: string;
        noteStoreUrl: string;
        webApiUrlPrefix: string;
        userId: string;
        shardId: string;
        expiresAt?: string;
      };
      input: { token: string; noteStoreUrl: string };
    }) => {
      let baseUrl = ctx.output.noteStoreUrl.includes('sandbox.evernote.com')
        ? 'https://sandbox.evernote.com'
        : 'https://www.evernote.com';

      let client = new Client({
        token: ctx.output.token,
        noteStoreUrl: ctx.output.noteStoreUrl
      });

      try {
        let user = await client.getUser(baseUrl);
        return {
          profile: {
            id: user.userId?.toString(),
            email: user.email,
            name: user.name || user.username
          }
        };
      } catch {
        return {
          profile: {}
        };
      }
    }
  });
