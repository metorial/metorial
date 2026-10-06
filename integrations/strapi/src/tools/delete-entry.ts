import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteEntry = SlateTool.create(spec, {
  name: 'Delete Entry',
  key: 'delete_entry',
  description: `Permanently delete an entry from an authorized Strapi content type by its document ID. Strapi 5 removes draft and published versions of the requested/default locale. Strapi 4 uses its numeric entry ID.`,
  constraints: [
    'Deletion is irreversible and can invoke instance hooks. Strapi 5 targets the requested locale or the default locale when omitted; it is not proof that backups, histories or other locales were erased.'
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
      documentId: z
        .string()
        .describe(
          'Strapi 5 documentId, or Strapi 4 numeric ID as a string, of the entry to delete'
        ),
      locale: z
        .string()
        .optional()
        .describe(
          'Strapi 5 locale to delete; omission targets the default locale. Strapi 4 uses the locale entry ID and requires this field omitted.'
        )
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
    let client = Client.fromContext(ctx);

    let result = await client.deleteEntry(ctx.input.contentType, ctx.input.documentId, {
      locale: ctx.input.locale
    });

    return {
      output: {
        deletedEntry: result.data
      },
      message: `Strapi accepted deletion of entry **${ctx.input.documentId}** from **${ctx.input.contentType}**.`
    };
  })
  .build();
