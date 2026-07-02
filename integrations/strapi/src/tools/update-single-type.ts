import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateSingleType = SlateTool.create(spec, {
  name: 'Update Single Type',
  key: 'update_single_type',
  description: `Update a Strapi single type entry. Single types have only one entry (e.g., homepage, site settings). Only provided fields are updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contentType: z
        .string()
        .describe('Singular API ID of the single type (e.g., "homepage", "global")'),
      fields: z.record(z.string(), z.any()).describe('Field values to update'),
      status: z.enum(['draft', 'published']).optional().describe('Publication status to set'),
      locale: z.string().optional().describe('Locale of the content to update')
    })
  )
  .output(
    z.object({
      entry: z.record(z.string(), z.any()).describe('The updated single type entry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.updateSingleType(ctx.input.contentType, ctx.input.fields, {
      status: ctx.input.status,
      locale: ctx.input.locale
    });

    return {
      output: {
        entry: result.data
      },
      message: `Updated single type **${ctx.input.contentType}**.`
    };
  })
  .build();
