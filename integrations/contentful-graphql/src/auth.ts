import { SlateAuth } from 'slates';
import { z } from 'zod';
import { validateToken } from './lib/validation';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      previewToken: z.string().optional(),
      managementToken: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Content Delivery API Token',
    key: 'cda_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Content Delivery API (CDA) access token for querying published content. Found under Settings > API keys in Contentful.'
        ),
      previewToken: z
        .string()
        .optional()
        .describe(
          'Content Preview API (CPA) access token for querying draft/unpublished content. Found under Settings > API keys in Contentful.'
        ),
      managementToken: z
        .string()
        .optional()
        .describe(
          'Optional Content Management API (CMA) personal access token for list_spaces account discovery. This does not establish which spaces the delivery or preview key authorizes.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: validateToken(ctx.input.token, 'Content Delivery API'),
          previewToken:
            ctx.input.previewToken === undefined
              ? undefined
              : validateToken(ctx.input.previewToken, 'Content Preview API'),
          managementToken:
            ctx.input.managementToken === undefined
              ? undefined
              : validateToken(ctx.input.managementToken, 'Content Management API')
        }
      };
    }
  });
