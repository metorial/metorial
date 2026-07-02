import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listListEntries = SlateTool.create(spec, {
  name: 'List Allow/Block Entries',
  key: 'list_list_entries',
  description: `List entries in an email allow or block list. Specify the direction (send/receive) and list type (allow/block) to view the corresponding list entries.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      direction: z.enum(['send', 'receive']).describe('Email flow direction'),
      listType: z.enum(['allow', 'block']).describe('Type of list'),
      limit: z.number().optional().describe('Maximum entries per page'),
      pageToken: z.string().optional().describe('Pagination cursor'),
      ascending: z.boolean().optional().describe('Sort oldest first when true')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of entries in this page'),
      nextPageToken: z.string().optional().describe('Cursor for the next page'),
      entries: z
        .array(
          z.object({
            entry: z.string().describe('Email address or domain'),
            direction: z.string().describe('Email flow direction'),
            listType: z.string().describe('List type'),
            entryType: z.string().describe('Whether entry is an email or domain'),
            reason: z.string().optional().describe('Reason for the entry'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('Array of list entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

    let result = await client.listEntries(ctx.input.direction, ctx.input.listType, {
      limit: ctx.input.limit,
      pageToken: ctx.input.pageToken,
      ascending: ctx.input.ascending
    });

    let entries = result.entries.map(e => ({
      entry: e.entry,
      direction: e.direction,
      listType: e.list_type,
      entryType: e.entry_type,
      reason: e.reason,
      createdAt: e.created_at
    }));

    return {
      output: {
        count: result.count,
        nextPageToken: result.nextPageToken,
        entries
      },
      message: `Found **${result.count}** ${ctx.input.direction} ${ctx.input.listType}list entries.`
    };
  })
  .build();
