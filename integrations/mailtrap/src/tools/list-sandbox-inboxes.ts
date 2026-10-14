import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailtrapClient } from '../lib/client';
import { spec } from '../spec';

export let listSandboxInboxes = SlateTool.create(spec, {
  name: 'List Sandbox Inboxes',
  key: 'list_sandbox_inboxes',
  description:
    'Discover accessible sandbox inbox IDs, names, project memberships, and message counts. Pass an inbox ID to list_sandbox_messages or get_sandbox_message.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      inboxes: z
        .array(
          z.object({
            inboxId: z.number().describe('Sandbox inbox ID'),
            name: z.string().describe('Sandbox inbox name'),
            projectId: z.number().describe('Project containing this inbox'),
            status: z.string().describe('Inbox status'),
            messageCount: z.number().describe('Captured message count'),
            unreadMessageCount: z.number().describe('Unread captured message count')
          })
        )
        .describe('Accessible sandbox inboxes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailtrapClient({ token: ctx.auth.token });
    let result = await client.listSandboxInboxes();
    let inboxes = result.map(inbox => ({
      inboxId: inbox.id,
      name: inbox.name,
      projectId: inbox.project_id,
      status: inbox.status,
      messageCount: inbox.emails_count,
      unreadMessageCount: inbox.emails_unread_count
    }));
    return {
      output: { inboxes },
      message: `Found ${inboxes.length} sandbox inbox(es).`
    };
  })
  .build();
