import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateInbox = SlateTool.create(spec, {
  name: 'Update Inbox',
  key: 'update_inbox',
  description: `Update an inbox's display name. The display name format is typically "Display Name <username@domain.com>".`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('Unique identifier of the inbox to update'),
      displayName: z.string().describe('New display name for the inbox')
    })
  )
  .output(
    z.object({
      inboxId: z.string().describe('Unique inbox identifier'),
      podId: z.string().describe('Pod the inbox belongs to'),
      displayName: z.string().optional().describe('Updated display name'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });
    let inbox = await client.updateInbox(ctx.input.inboxId, ctx.input.displayName);

    return {
      output: {
        inboxId: inbox.inbox_id,
        podId: inbox.pod_id,
        displayName: inbox.display_name,
        updatedAt: inbox.updated_at
      },
      message: `Updated inbox display name to **${inbox.display_name}**.`
    };
  })
  .build();
