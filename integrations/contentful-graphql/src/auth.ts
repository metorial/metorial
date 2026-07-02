import { SlateAuth } from 'slates';
import { z } from 'zod';

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
          'Content Management API (CMA) personal access token. Required for automatic webhook registration in triggers. Found under Settings > CMA tokens.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          previewToken: ctx.input.previewToken,
          managementToken: ctx.input.managementToken
        }
      };
    }
  });
