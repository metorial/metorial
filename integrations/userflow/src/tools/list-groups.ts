import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Lists groups (companies) with pagination support. Returns a paginated list of groups and their attributes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of groups to return'),
      startingAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination — pass the last group ID from the previous page'),
      orderBy: z
        .string()
        .optional()
        .describe('Sort order (e.g. "created_at", "-created_at", "attributes.name")'),
      expand: z
        .array(z.string())
        .optional()
        .describe('Related objects to expand (e.g. memberships)')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('ID of the group'),
            attributes: z.record(z.string(), z.unknown()).describe('Group attributes'),
            createdAt: z.string().describe('Timestamp when the group was created')
          })
        )
        .describe('List of groups'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.listGroups({
      limit: ctx.input.limit,
      startingAfter: ctx.input.startingAfter,
      orderBy: ctx.input.orderBy,
      expand: ctx.input.expand
    });

    let groups = result.data.map(g => ({
      groupId: g.id,
      attributes: g.attributes,
      createdAt: g.created_at
    }));

    return {
      output: {
        groups,
        hasMore: result.has_more
      },
      message: `Retrieved **${groups.length}** group(s).${result.has_more ? ' More results are available.' : ''}`
    };
  })
  .build();
