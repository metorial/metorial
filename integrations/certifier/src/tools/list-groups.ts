import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `List credential groups with pagination. Groups are organizational containers for credentials, each linked to certificate/badge designs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of groups per page (default: 20)'),
      cursor: z.string().optional().describe('Pagination cursor for fetching the next page')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('ID of the group'),
            name: z.string().describe('Name of the group'),
            certificateDesignId: z.string().nullable().describe('Certificate design ID'),
            badgeDesignId: z.string().nullable().describe('Badge design ID'),
            learningEventUrl: z.string().nullable().describe('Learning event URL'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('List of groups'),
      nextCursor: z.string().nullable().describe('Cursor for the next page'),
      prevCursor: z.string().nullable().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listGroups(ctx.input.limit, ctx.input.cursor);

    let groups = result.data.map(g => ({
      groupId: g.id,
      name: g.name,
      certificateDesignId: g.certificateDesignId,
      badgeDesignId: g.badgeDesignId,
      learningEventUrl: g.learningEventUrl,
      createdAt: g.createdAt
    }));

    return {
      output: {
        groups,
        nextCursor: result.pagination.next,
        prevCursor: result.pagination.prev
      },
      message: `Retrieved **${groups.length}** group(s).${result.pagination.next ? ' More results available.' : ''}`
    };
  })
  .build();
