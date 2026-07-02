import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDocument = SlateTool.create(spec, {
  name: 'Delete Document',
  key: 'delete_document',
  description: `Permanently delete a document from Affinda. This removes the document and all its extracted data from the database. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      documentIdentifier: z.string().describe('Unique identifier of the document to delete.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the document was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.deleteDocument(ctx.input.documentIdentifier);

    return {
      output: {
        deleted: true
      },
      message: `Document \`${ctx.input.documentIdentifier}\` has been permanently deleted.`
    };
  })
  .build();
