import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createInbox = SlateTool.create(spec, {
  name: 'Create Inbox',
  key: 'create_inbox',
  description: `Create a new email inbox for an AI agent. The inbox can use the default \`@agentmail.to\` domain or a custom domain (requires a paid plan). If no username is provided, one will be auto-generated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      username: z
        .string()
        .optional()
        .describe('Username for the inbox email address. Auto-generated if not provided'),
      domain: z
        .string()
        .optional()
        .describe(
          'Domain for the inbox. Defaults to agentmail.to. Custom domains require a paid plan'
        ),
      displayName: z
        .string()
        .optional()
        .describe('Display name in format "Display Name <username@domain.com>"'),
      clientId: z
        .string()
        .optional()
        .describe('Client-side identifier for idempotent creation')
    })
  )
  .output(
    z.object({
      inboxId: z.string().describe('Unique identifier for the created inbox'),
      podId: z.string().describe('Pod the inbox belongs to'),
      displayName: z.string().optional().describe('Display name of the inbox'),
      createdAt: z.string().describe('Timestamp when the inbox was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

    let inbox = await client.createInbox({
      username: ctx.input.username,
      domain: ctx.input.domain,
      displayName: ctx.input.displayName,
      clientId: ctx.input.clientId
    });

    return {
      output: {
        inboxId: inbox.inbox_id,
        podId: inbox.pod_id,
        displayName: inbox.display_name,
        createdAt: inbox.created_at
      },
      message: `Created inbox **${inbox.display_name || inbox.inbox_id}** in pod ${inbox.pod_id}.`
    };
  })
  .build();
