import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDoc = SlateTool.create(spec, {
  name: 'Delete Document',
  key: 'delete_doc',
  description: `Moves a document to the trash in Dart. The document is not permanently deleted and can be restored from the Dart UI.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the document to delete (move to trash)')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the document was successfully trashed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteDoc(ctx.input.docId);

    return {
      output: { deleted: true },
      message: `Document **${ctx.input.docId}** has been moved to trash.`
    };
  })
  .build();
