import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let skipDocuments = SlateTool.create(spec, {
  name: 'Skip Documents',
  key: 'skip_documents',
  description: `Mark one or more documents as skipped in a mailbox. Skipped documents will not be parsed. Use this for documents that should be ignored.`
})
  .input(
    z.object({
      mailboxId: z.string().describe('ID of the mailbox containing the documents'),
      documentIds: z.array(z.string()).min(1).describe('IDs of the documents to skip')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the skip operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.skipDocuments(ctx.input.mailboxId, ctx.input.documentIds);

    return {
      output: { success: true },
      message: `Skipped **${ctx.input.documentIds.length}** document(s) in mailbox **${ctx.input.mailboxId}**.`
    };
  })
  .build();
