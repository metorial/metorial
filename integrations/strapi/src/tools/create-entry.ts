import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEntry = SlateTool.create(spec, {
  name: 'Create Entry',
  key: 'create_entry',
  description: `Create a new entry in any Strapi content type. Pass field values as key-value pairs in the fields object. Supports setting locale and initial publication status.`,
  instructions: [
    'The fields object keys must match the field names defined in the content type schema.',
    'For relation fields, pass the document ID(s) of related entries.',
    'For media fields, pass the file ID(s) from the media library.'
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
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Field values for the new entry (e.g., {"title": "My Article", "content": "..."})'
        ),
      status: z.enum(['draft', 'published']).optional().describe('Initial publication status'),
      locale: z.string().optional().describe('Locale for the entry (requires i18n enabled)')
    })
  )
  .output(
    z.object({
      entry: z.record(z.string(), z.any()).describe('The created entry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.createEntry(ctx.input.contentType, ctx.input.fields, {
      status: ctx.input.status,
      locale: ctx.input.locale
    });

    let documentId = result.data?.documentId ?? result.data?.id;

    return {
      output: {
        entry: result.data
      },
      message: `Created new entry in **${ctx.input.contentType}**${documentId ? ` with document ID **${documentId}**` : ''}.`
    };
  })
  .build();
