import { SlateTool } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve a list of Duo Security users. Supports filtering by username or email, and pagination for large result sets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      username: z.string().optional().describe('Filter by exact username'),
      email: z.string().optional().describe('Filter by email address'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of users to return (default 100, max 300)'),
      offset: z.number().optional().describe('Pagination offset to start from')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string(),
          username: z.string(),
          email: z.string().optional(),
          realname: z.string().optional(),
          status: z.string(),
          isEnrolled: z.boolean(),
          lastLogin: z.number().nullable().optional(),
          created: z.number().optional(),
          phones: z.array(z.any()).optional(),
          groups: z.array(z.any()).optional()
        })
      ),
      totalObjects: z.number().optional(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname
    });

    let result = await client.listUsers({
      username: ctx.input.username,
      email: ctx.input.email,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let users = (result.response || []).map((u: any) => ({
      userId: u.user_id,
      username: u.username,
      email: u.email || undefined,
      realname: u.realname || undefined,
      status: u.status,
      isEnrolled: u.is_enrolled,
      lastLogin: u.last_login ?? null,
      created: u.created,
      phones: u.phones,
      groups: u.groups
    }));

    let totalObjects = result.metadata?.total_objects;
    let hasMore =
      totalObjects !== undefined
        ? (ctx.input.offset ?? 0) + users.length < totalObjects
        : false;

    return {
      output: { users, totalObjects, hasMore },
      message: `Found **${users.length}** users${totalObjects ? ` out of ${totalObjects} total` : ''}.`
    };
  })
  .build();
