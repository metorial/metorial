import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listInboxes = SlateTool.create(spec, {
  name: 'List Inboxes',
  key: 'list_inboxes',
  description: `List all shared inboxes configured in your Hiver account. Returns inbox details including names and email addresses. Useful for discovering available shared mailboxes before performing operations on conversations within them.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      inboxes: z
        .array(
          z.object({
            inboxId: z.string().describe('Unique identifier of the inbox'),
            name: z.string().describe('Display name of the inbox'),
            email: z.string().optional().describe('Email address associated with the inbox'),
            type: z.string().optional().describe('Type of the inbox')
          })
        )
        .describe('List of shared inboxes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let inboxes = await client.listInboxes();

    let mapped = inboxes.map(inbox => ({
      inboxId: String(inbox.id),
      name: inbox.name ?? '',
      email: inbox.email,
      type: inbox.type
    }));

    return {
      output: { inboxes: mapped },
      message: `Found **${mapped.length}** shared inbox${mapped.length === 1 ? '' : 'es'}.`
    };
  });
