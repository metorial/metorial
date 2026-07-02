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
            createdAt: z.string().describe('Timestamp when the user was created')
          })
        )
        .describe('List of users'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.listUsers({
      limit: ctx.input.limit,
      startingAfter: ctx.input.startingAfter,
      orderBy: ctx.input.orderBy,
      expand: ctx.input.expand
    });

    let users = result.data.map(u => ({
      userId: u.id,
      attributes: u.attributes,
      createdAt: u.created_at
    }));

    return {
      output: {
        users,
        hasMore: result.has_more
      },
      message: `Retrieved **${users.length}** user(s).${result.has_more ? ' More results are available.' : ''}`
    };
  })
  .build();
