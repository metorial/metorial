import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Lists access groups in your Heartbeat community with optional filtering. Can filter by parent group or by user membership.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of groups per page (1-100)'),
      startingAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination — pass the last group ID from the previous page'),
      parentGroupId: z.string().optional().describe('Filter groups by parent group ID'),
      userId: z.string().optional().describe('Filter groups by user membership')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Group ID'),
            name: z.string().describe('Group name'),
            description: z.string().describe('Group description'),
            isJoinable: z.boolean().describe('Whether the group is joinable'),
            parentGroup: z.string().nullable().describe('Parent group ID')
          })
        )
        .describe('List of groups'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listGroups({
      limit: ctx.input.limit,
      startingAfter: ctx.input.startingAfter,
      parentGroupId: ctx.input.parentGroupId,
      userId: ctx.input.userId
    });

    let groups = result.data.map(g => ({
      groupId: g.id,
      name: g.name,
      description: g.description,
      isJoinable: g.isJoinable,
      parentGroup: g.parentGroup
    }));

    return {
      output: {
        groups,
        hasMore: result.hasMore
      },
      message: `Found ${groups.length} group(s).${result.hasMore ? ' More results are available.' : ''}`
    };
  })
  .build();
