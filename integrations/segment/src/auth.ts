import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Segment Public API token for workspace management'),
      writeKey: z.string().optional().describe('Segment source write key for the Tracking API')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Public API Token',
    key: 'public_api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Segment Public API token (created in Settings > Access Management > Tokens)'
        ),
      writeKey: z
        .string()
        .optional()
        .describe(
          'Segment source write key for sending tracking data (optional, only needed for Tracking API calls)'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          writeKey: ctx.input.writeKey
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://api.segmentapis.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Content-Type': 'application/json'
        }
      });

      let response = await http.get('/v1/workspace');
      let workspace = response.data?.data?.workspace;

      return {
        profile: {
          id: workspace?.id ?? undefined,
          name: workspace?.name ?? workspace?.slug ?? undefined
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Write Key Only',
    key: 'write_key_only',

    inputSchema: z.object({
      writeKey: z.string().describe('Segment source write key for the Tracking API')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: '',
          writeKey: ctx.input.writeKey
        }
      };
    }
  });
