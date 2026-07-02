import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let deleteDocumentStore = SlateTool.create(spec, {
  name: 'Delete Document Store',
  key: 'delete_document_store',
  description: `Permanently delete a document store and its contents from Flowise. This action cannot be undone.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      storeId: z.string().describe('ID of the document store to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    await client.deleteDocumentStore(ctx.input.storeId);

    return {
      output: { success: true },
      message: `Deleted document store \`${ctx.input.storeId}\`.`
    };
  })
  .build();
