import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDocument = SlateTool.create(spec, {
  name: 'Delete Document',
  key: 'delete_document',
  description: `Permanently delete a document from Ragie. The document and all its chunks will be removed from the index.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to delete'),
      partition: z.string().optional().describe('Partition override')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the deleted document'),
      status: z.string().describe('Deletion status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      partition: ctx.config.partition
    });

    let result = await client.deleteDocument(ctx.input.documentId, {
      partition: ctx.input.partition
    });

    return {
      output: {
        documentId: ctx.input.documentId,
        status: result.status
      },
      message: `Document \`${ctx.input.documentId}\` deleted successfully.`
    };
  })
  .build();
