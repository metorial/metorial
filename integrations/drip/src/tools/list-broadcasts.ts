import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBroadcasts = SlateTool.create(spec, {
  name: 'List Broadcasts',
  key: 'list_broadcasts',
  description: `List single-email campaigns (broadcasts) in Drip. Filter by status: draft, scheduled, or sent. Use this to review one-time email sends.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['draft', 'scheduled', 'sent'])
        .optional()
        .describe('Filter by broadcast status.'),
      page: z.number().optional().describe('Page number for pagination.'),
      perPage: z.number().optional().describe('Results per page.'),
      sortBy: z.enum(['name', 'created_at', 'send_at']).optional().describe('Sort field.'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction.')
    })
  )
  .output(
    z.object({
      broadcasts: z
        .array(
          z.object({
            broadcastId: z.string(),
            name: z.string().optional(),
            status: z.string().optional(),
            sendAt: z.string().optional(),
            createdAt: z.string().optional()
          })
        )
        .describe('List of broadcasts.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    let result = await client.listBroadcasts({
      status: ctx.input.status,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection
    });

    let broadcasts = (result.broadcasts ?? []).map((b: any) => ({
      broadcastId: b.id ?? '',
      name: b.name,
      status: b.status,
      sendAt: b.send_at,
      createdAt: b.created_at
    }));

    return {
      output: { broadcasts },
      message: `Found **${broadcasts.length}** broadcasts.`
    };
  })
  .build();
