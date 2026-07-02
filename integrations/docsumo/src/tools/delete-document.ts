import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDocument = SlateTool.create(spec, {
  name: 'Delete Document',
  key: 'delete_document',
  description: `Permanently delete a document from your Docsumo account. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      docId: z.string().describe('Unique identifier of the document to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the document was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteDocument(ctx.input.docId);

    return {
      output: { deleted: true },
      message: `Document **${ctx.input.docId}** has been permanently deleted.`
    };
  })
  .build();
