import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Lists users in the MaintainX organization. Can filter to only return assignable users (those who can be assigned to work orders). For multi-organization keys, call list_organizations and pass organizationId.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      onlyAssignable: z
        .boolean()
        .optional()
        .describe('When true, only return users that can be assigned to work orders'),
      limit: z
        .number()
        .refine(Number.isSafeInteger, 'Limit must be a safe whole number')
        .min(1)
        .max(200)
        .optional()
        .describe('Max results per page (1-200, default 100)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.number().describe('User ID'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            email: z.string().optional().describe('Email address'),
            role: z.string().optional().describe('User role'),
            createdAt: z.string().optional().describe('Created at'),
            updatedAt: z.string().optional().describe('Updated at')
          })
        )
        .describe('List of users'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    let result = await client.listUsers({
      onlyAssignable: ctx.input.onlyAssignable,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let users = (result.users ?? []).map((u: any) => ({
      userId: u.id ?? undefined,
      firstName: u.firstName ?? undefined,
      lastName: u.lastName ?? undefined,
      email: u.email ?? undefined,
      role: u.role ?? undefined,
      createdAt: u.createdAt ?? undefined,
      updatedAt: u.updatedAt ?? undefined
    }));

    return {
      output: {
        users,
        nextCursor: result.nextCursor ?? undefined
      },
      message: `Found **${users.length}** user(s)${result.nextCursor ? ' (more pages available)' : ''}.`
    };
  })
  .build();
