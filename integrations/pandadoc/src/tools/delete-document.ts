import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

export let deleteDocument = SlateTool.create(spec, {
  name: 'Delete Document',
  key: 'delete_document',
  description: `Permanently delete a PandaDoc document by its ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('UUID of the document to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the document was successfully deleted'),
      documentId: z.string().describe('UUID of the deleted document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.deleteDocument(ctx.input.documentId);

    return {
      output: {
        deleted: true,
        documentId: ctx.input.documentId
      },
      message: `Document \`${ctx.input.documentId}\` has been deleted.`
    };
  })
  .build();
