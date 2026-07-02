import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignWellClient } from '../lib/client';
import { spec } from '../spec';

export let deleteDocument = SlateTool.create(spec, {
  name: 'Delete Document',
  key: 'delete_document',
  description: `Permanently delete a document from SignWell. This removes the document and all associated data.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to delete')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the deleted document'),
      deleted: z.boolean().describe('Whether the document was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignWellClient({ token: ctx.auth.token });

    await client.deleteDocument(ctx.input.documentId);

    return {
      output: {
        documentId: ctx.input.documentId,
        deleted: true
      },
      message: `Document **${ctx.input.documentId}** has been deleted.`
    };
  })
  .build();
