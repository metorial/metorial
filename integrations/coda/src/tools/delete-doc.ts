import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDocTool = SlateTool.create(spec, {
  name: 'Delete Doc',
  key: 'delete_doc',
  description: `Permanently delete a Coda doc. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the doc was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteDoc(ctx.input.docId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted doc **${ctx.input.docId}**.`
    };
  })
  .build();
