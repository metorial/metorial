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
      condition: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Attribute condition object. Use type=attribute, attribute_name, operator, and value; combine conditions using type=clause.'
        ),
      userId: z.string().optional().describe('Only include groups this user belongs to.'),
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
            memberships: z
              .array(z.record(z.string(), z.unknown()))
              .nullable()
              .optional()
              .describe('Memberships when expanded'),
            users: z
              .array(z.record(z.string(), z.unknown()))
              .nullable()
              .optional()
              .describe('Users when expanded'),
            createdAt: z.string().describe('Timestamp when the group was created')
          })
        )
        .describe('List of groups'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextPageUrl: z.string().nullable().describe('URL for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.listGroups({
      condition: ctx.input.condition,
      userId: ctx.input.userId,
      limit: ctx.input.limit,
      startingAfter: ctx.input.startingAfter,
      orderBy: ctx.input.orderBy,
      expand: ctx.input.expand
    });

    let groups = result.data.map(g => ({
      groupId: g.id,
      attributes: g.attributes,
      memberships: g.memberships,
      users: g.users,
      createdAt: g.created_at
    }));

    return {
      output: {
        groups,
        hasMore: result.has_more,
        nextPageUrl: result.next_page_url
      },
      message: `Retrieved **${groups.length}** group(s).${result.has_more ? ' More results are available.' : ''}`
    };
  })
  .build();
