import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `List all webhooks configured for a specific mailbox. Returns webhook URLs, trigger events, and configuration details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mailboxId: z.string().describe('ID of the mailbox to list webhooks for')
    })
  )
  .output(
    z.object({
      webhooks: z
        .array(
          z.object({
            webhookId: z.string().describe('Unique identifier of the webhook'),
            url: z.string().optional().describe('URL the webhook sends requests to'),
            event: z.string().optional().describe('Trigger event type'),
            tableId: z.string().optional().describe('Table ID (for table.parsed events)')
          })
        )
        .describe('List of webhooks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let webhooks = await client.listWebhooks(ctx.input.mailboxId);

    let mapped = (Array.isArray(webhooks) ? webhooks : []).map((wh: any) => ({
      webhookId: wh._id || wh.id,
      url: wh.url,
      event: wh.event,
      tableId: wh.table_id || wh.tableId
    }));

    return {
      output: { webhooks: mapped },
      message: `Found **${mapped.length}** webhook(s) for mailbox **${ctx.input.mailboxId}**.`
    };
  })
  .build();
