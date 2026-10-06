import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEntry = SlateTool.create(spec, {
  name: 'Get Entry',
  key: 'get_entry',
  description: `Retrieve a single entry from an authorized Strapi content type by its document ID. Supports field selection, relation population, locale, and draft/published status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contentType: z
        .string()
        .describe('Plural API ID of the content type (e.g., "articles", "products")'),
      documentId: z
        .string()
        .describe(
          'Strapi 5 documentId, or Strapi 4 numeric ID as a string, of the entry to retrieve'
        ),
      fields: z.array(z.string()).optional().describe('Specific fields to return'),
      populate: z
        .union([z.string(), z.record(z.string(), z.any())])
        .optional()
        .describe(
          'Relations to populate. Use "*" for permitted first-level fields, or an object for granular control'
        ),
      status: z
        .enum(['draft', 'published'])
        .optional()
        .describe('Retrieve draft or published version'),
      locale: z.string().optional().describe('Locale code for i18n content')
    })
  )
  .output(
    z.object({
      entry: z.record(z.string(), z.any()).describe('The content entry')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    let result = await client.getEntry(ctx.input.contentType, ctx.input.documentId, {
      fields: ctx.input.fields,
      populate: ctx.input.populate,
      status: ctx.input.status,
      locale: ctx.input.locale
    });

    return {
      output: {
        entry: result.data
      },
      message: `Retrieved entry **${ctx.input.documentId}** from **${ctx.input.contentType}**.`
    };
  })
  .build();
