import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Create a new webhook for a mailbox to receive real-time notifications when documents are processed. Configure the target URL, trigger event, and optionally a table ID for table-parsed events.`,
  instructions: [
    'Available events: `doc.parsed`, `doc.parsed.flat`, `doc.fail`, `doc.received`, `table.parsed`.',
    'The `table.parsed` event requires a **tableId** parameter to specify which table field to listen to.'
  ]
})
  .input(
    z.object({
      mailboxId: z.string().describe('ID of the mailbox to create the webhook for'),
      url: z.string().describe('URL to receive webhook POST requests'),
      event: z
        .enum(['doc.parsed', 'doc.parsed.flat', 'doc.fail', 'doc.received', 'table.parsed'])
        .describe('Trigger event type'),
      tableId: z
        .string()
        .optional()
        .describe('Table field ID (required for table.parsed event)')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('Unique identifier of the created webhook'),
      url: z.string().optional().describe('URL of the webhook'),
      event: z.string().optional().describe('Trigger event type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let wh = await client.createWebhook({
      mailboxId: ctx.input.mailboxId,
      url: ctx.input.url,
      event: ctx.input.event,
      tableId: ctx.input.tableId
    });

    return {
      output: {
        webhookId: wh._id || wh.id,
        url: wh.url,
        event: wh.event
      },
      message: `Created webhook for event **${ctx.input.event}** on mailbox **${ctx.input.mailboxId}**.`
    };
  })
  .build();
