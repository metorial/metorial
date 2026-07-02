import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listInboxes = SlateTool.create(spec, {
  name: 'List Inboxes',
  key: 'list_inboxes',
  description: `List Crisp website inboxes. Use this to find inbox IDs for conversation filtering or moving conversations between inboxes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number for pagination (starts at 1)')
    })
  )
  .output(
    z.object({
      inboxes: z
        .array(
          z.object({
            inboxId: z.string().describe('Inbox identifier'),
            name: z.string().optional().describe('Inbox name'),
            emoji: z.string().optional().describe('Inbox emoji'),
            order: z.number().optional().describe('Inbox display order'),
            operatorIds: z.array(z.string()).optional().describe('Operator IDs in the inbox'),
            operator: z.string().optional().describe('Boolean operator used on conditions'),
            conditions: z.array(z.record(z.string(), z.any())).optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
          })
        )
        .describe('List of inboxes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteId: ctx.config.websiteId,
      tier: ctx.auth.tier
    });
    let results = await client.listWebsiteInboxes(ctx.input.pageNumber);

    let inboxes = (results || []).map((inbox: any) => ({
      inboxId: inbox.inbox_id,
      name: inbox.name,
      emoji: inbox.emoji,
      order: inbox.order,
      operatorIds: inbox.operators,
      operator: inbox.operator,
      conditions: inbox.conditions,
      createdAt: inbox.created_at ? String(inbox.created_at) : undefined,
      updatedAt: inbox.updated_at ? String(inbox.updated_at) : undefined
    }));

    return {
      output: { inboxes },
      message: `Found **${inboxes.length}** inboxes on page ${ctx.input.pageNumber ?? 1}.`
    };
  })
  .build();
