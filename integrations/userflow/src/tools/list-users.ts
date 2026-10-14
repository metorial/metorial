import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Lists users with pagination support. Returns a paginated list of users and their attributes. Supports sorting and expanding related objects.`,
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
      email: z.string().optional().describe('Only include users with this email attribute.'),
      groupId: z.string().optional().describe('Only include members of this group.'),
      limit: z.number().optional().describe('Maximum number of users to return'),
      startingAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination — pass the last user ID from the previous page'),
      orderBy: z
        .string()
        .optional()
        .describe(
          'Sort order (e.g. "created_at", "-created_at" for descending, "attributes.name")'
        ),
      expand: z
        .array(z.string())
        .optional()
        .describe('Related objects to expand (e.g. memberships, groups)')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().describe('ID of the user'),
            attributes: z.record(z.string(), z.unknown()).describe('User attributes'),
            memberships: z
              .array(z.record(z.string(), z.unknown()))
              .nullable()
              .optional()
              .describe('Memberships when expanded'),
            groups: z
              .array(z.record(z.string(), z.unknown()))
              .nullable()
              .optional()
              .describe('Groups when expanded'),
            createdAt: z.string().describe('Timestamp when the user was created')
          })
        )
        .describe('List of users'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextPageUrl: z.string().nullable().describe('URL for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.listUsers({
      condition: ctx.input.condition,
      email: ctx.input.email,
      groupId: ctx.input.groupId,
      limit: ctx.input.limit,
      startingAfter: ctx.input.startingAfter,
      orderBy: ctx.input.orderBy,
      expand: ctx.input.expand
    });

    let users = result.data.map(u => ({
      userId: u.id,
      attributes: u.attributes,
      memberships: u.memberships,
      groups: u.groups,
      createdAt: u.created_at
    }));

    return {
      output: {
        users,
        hasMore: result.has_more,
        nextPageUrl: result.next_page_url
      },
      message: `Retrieved **${users.length}** user(s).${result.has_more ? ' More results are available.' : ''}`
    };
  })
  .build();
