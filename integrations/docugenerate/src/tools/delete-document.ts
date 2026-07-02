import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocuGenerateClient } from '../lib/client';
import { spec } from '../spec';

export let deleteDocument = SlateTool.create(spec, {
  name: 'Delete Document',
  key: 'delete_document',
  description: `Permanently deletes a generated document. This action cannot be undone.`,
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
      documentId: z.string().describe('ID of the deleted document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocuGenerateClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.deleteDocument(ctx.input.documentId);

    return {
      output: { documentId: ctx.input.documentId },
      message: `Deleted document **${ctx.input.documentId}**`
    };
  })
  .build();
