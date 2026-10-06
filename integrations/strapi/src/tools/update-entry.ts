import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateEntry = SlateTool.create(spec, {
  name: 'Update Entry',
  key: 'update_entry',
  description: `Update an existing entry in an authorized Strapi content type. Only the fields provided will be updated; other fields remain unchanged. Supports locale-specific updates.`,
  instructions: [
    'Only include fields you want to change — omitted fields are not affected.',
    'For relation fields, use connect/disconnect/set syntax for fine-grained control.'
  ],
  constraints: [
    'Strapi 5 REST writes publish immediately by default when Draft & Publish is enabled. Pass status=draft to keep changes in the draft. Instance hooks can have external effects. For Strapi 4 omit status and use the documented publishedAt field explicitly.'
  ],
  tags: {
    destructive: false
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
          'Strapi 5 documentId, or Strapi 4 numeric ID as a string, of the entry to update'
        ),
      fields: z
        .record(z.string(), z.any())
        .describe('Field values to update (e.g., {"title": "Updated Title"})'),
      status: z
        .enum(['draft', 'published'])
        .optional()
        .describe('Strapi 5 publication status; omit on Strapi 4 writes'),
      locale: z.string().optional().describe('Locale of the entry to update')
    })
  )
  .output(
    z.object({
      entry: z.record(z.string(), z.any()).describe('The updated entry')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    let result = await client.updateEntry(
      ctx.input.contentType,
      ctx.input.documentId,
      ctx.input.fields,
      {
        status: ctx.input.status,
        locale: ctx.input.locale
      }
    );

    return {
      output: {
        entry: result.data
      },
      message: `Updated entry **${ctx.input.documentId}** in **${ctx.input.contentType}**.`
    };
  })
  .build();
