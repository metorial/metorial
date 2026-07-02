import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listInboxes = SlateTool.create(spec, {
  name: 'List Inboxes',
  key: 'list_inboxes',
  description: `List all email inboxes in the account. Supports cursor-based pagination. Returns inboxes sorted by creation date (newest first by default).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of inboxes to return per page'),
      pageToken: z.string().optional().describe('Pagination cursor from a previous response'),
      ascending: z.boolean().optional().describe('Sort by oldest first when true')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of inboxes returned in this page'),
      nextPageToken: z.string().optional().describe('Cursor for fetching the next page'),
      inboxes: z
        .array(
          z.object({
            inboxId: z.string().describe('Unique inbox identifier'),
            podId: z.string().describe('Pod the inbox belongs to'),
            displayName: z.string().optional().describe('Display name of the inbox'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('Array of inboxes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

    let result = await client.listInboxes({
      limit: ctx.input.limit,
      pageToken: ctx.input.pageToken,
      ascending: ctx.input.ascending
    });

    let inboxes = result.inboxes.map(i => ({
      inboxId: i.inbox_id,
      podId: i.pod_id,
      displayName: i.display_name,
      createdAt: i.created_at
    }));

    return {
      output: {
        count: result.count,
        nextPageToken: result.nextPageToken,
        inboxes
      },
      message: `Found **${result.count}** inbox(es).${result.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
