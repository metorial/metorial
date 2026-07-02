import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSingleType = SlateTool.create(spec, {
  name: 'Get Single Type',
  key: 'get_single_type',
  description: `Retrieve a Strapi single type entry. Single types are content types with only one entry (e.g., homepage, site settings). Supports field selection, relation population, locale, and draft/published status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contentType: z
        .string()
        .describe('Singular API ID of the single type (e.g., "homepage", "global")'),
      fields: z.array(z.string()).optional().describe('Specific fields to return'),
      populate: z
        .union([z.string(), z.record(z.string(), z.any())])
        .optional()
        .describe('Relations to populate. Use "*" for all, or an object for granular control'),
      status: z
        .enum(['draft', 'published'])
        .optional()
        .describe('Retrieve draft or published version'),
      locale: z.string().optional().describe('Locale code for i18n content')
    })
  )
  .output(
    z.object({
      entry: z.record(z.string(), z.any()).describe('The single type entry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.getSingleType(ctx.input.contentType, {
      fields: ctx.input.fields,
      populate: ctx.input.populate,
      status: ctx.input.status,
      locale: ctx.input.locale
    });

    return {
      output: {
        entry: result.data
      },
      message: `Retrieved single type **${ctx.input.contentType}**.`
    };
  })
  .build();
