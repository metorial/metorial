import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getInbox = SlateTool.create(spec, {
  name: 'Get Inbox',
  key: 'get_inbox',
  description: `Retrieve details of a specific email inbox by its ID, including its display name, pod association, and timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('Unique identifier of the inbox to retrieve')
    })
  )
  .output(
    z.object({
      inboxId: z.string().describe('Unique inbox identifier'),
      podId: z.string().describe('Pod the inbox belongs to'),
      displayName: z.string().optional().describe('Display name of the inbox'),
      clientId: z.string().optional().describe('Client identifier'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });
    let inbox = await client.getInbox(ctx.input.inboxId);

    return {
      output: {
        inboxId: inbox.inbox_id,
        podId: inbox.pod_id,
        displayName: inbox.display_name,
        clientId: inbox.client_id,
        createdAt: inbox.created_at,
        updatedAt: inbox.updated_at
      },
      message: `Retrieved inbox **${inbox.display_name || inbox.inbox_id}**.`
    };
  })
  .build();
