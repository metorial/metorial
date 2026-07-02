import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteEntry = SlateTool.create(spec, {
  name: 'Delete Entry',
  key: 'delete_entry',
  description: `Permanently delete an entry from any Strapi content type by its document ID. This removes both draft and published versions. For i18n content, a specific locale can be targeted.`,
  constraints: [
    'This action is irreversible — the entry and all its locale versions (unless a specific locale is targeted) will be permanently removed.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contentType: z
        .string()
        .describe('Plural API ID of the content type (e.g., "articles", "products")'),
      documentId: z.string().describe('Document ID of the entry to delete'),
      locale: z
        .string()
        .optional()
        .describe('Specific locale to delete (omit to delete all locales)')
    })
  )
  .output(
    z.object({
      deletedEntry: z
        .record(z.string(), z.any())
        .optional()
        .describe('The deleted entry data, if returned by the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.deleteEntry(ctx.input.contentType, ctx.input.documentId, {
      locale: ctx.input.locale
    });

    return {
      output: {
        deletedEntry: result.data
      },
      message: `Deleted entry **${ctx.input.documentId}** from **${ctx.input.contentType}**.`
    };
  })
  .build();
