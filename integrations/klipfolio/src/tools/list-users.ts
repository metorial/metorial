import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateInput } from '../lib/contracts';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in your Klipfolio account. Filter by client or email. Optionally include roles and group memberships for each user.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clientId: z.string().optional().describe('Filter users by client ID'),
      email: z.string().optional().describe('Filter users by email address'),
      includeRoles: z.boolean().optional().describe('Include role assignments'),
      includeGroups: z.boolean().optional().describe('Include group memberships'),
      limit: z.number().optional().describe('Maximum number of results (max 100)'),
      offset: z.number().optional().describe('Index of first result to return')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().optional(),
          dateLastLogin: z.string().optional(),
          dateCreated: z.string().optional(),
          isLockedOut: z.boolean().optional(),
          roles: z.array(z.any()).optional(),
          groups: z.array(z.any()).optional()
        })
      ),
      total: z.number().optional(),
      nextOffset: z.number().optional(),
      hasMore: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listUsers({
      clientId: ctx.input.clientId,
      email: ctx.input.email,
      includeRoles: ctx.input.includeRoles,
      includeGroups: ctx.input.includeGroups,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let users = (result?.data || []).map((user: any) => ({
      userId: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      dateLastLogin: user.date_last_login,
      dateCreated: user.date_created,
      isLockedOut: user.is_locked_out,
      roles: user.roles,
      groups: user.groups
    }));

    const offset = ctx.input.offset ?? 0;
    const hasMore =
      result.data.length > 0 &&
      (typeof result.meta?.total === 'number'
        ? offset + users.length < result.meta.total
        : users.length === (ctx.input.limit ?? 25));
    return {
      output: {
        users,
        total: result?.meta?.total,
        hasMore,
        nextOffset: hasMore ? offset + users.length : undefined
      },
      message: `Found **${users.length}** user(s)${result?.meta?.total ? ` out of ${result.meta.total} total` : ''}.`
    };
  })
  .build();
