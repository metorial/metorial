import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users on the n8n instance. Requires the applicable API-key scopes and instance/project permissions.`,
  constraints: [
    'Requires user:list or user:read and the corresponding instance/project permissions.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe(
          'Read this exact native user ID or documented email locator instead of listing; requires user:read.'
        ),
      includeRole: z.boolean().optional().describe('Include role information for each user'),
      projectId: z.string().optional().describe('Filter users by project membership'),
      limit: z.number().optional().describe('Maximum number of users to return'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string().describe('User ID'),
          email: z.string().optional().describe('User email address'),
          firstName: z.string().optional().describe('User first name'),
          lastName: z.string().optional().describe('User last name'),
          role: z.string().optional().describe('User role (when includeRole is true)'),
          createdAt: z.string().optional().describe('User creation timestamp')
        })
      ),
      nextCursor: z.string().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);

    let result =
      ctx.input.userId !== undefined
        ? {
            data: [await client.getUser(ctx.input.userId, ctx.input.includeRole)],
            nextCursor: undefined
          }
        : await client.listUsers({
            includeRole: ctx.input.includeRole,
            projectId: ctx.input.projectId,
            limit: ctx.input.limit,
            cursor: ctx.input.cursor
          });

    let users = (result.data || []).map(u => ({
      userId: String(u.id),
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      createdAt: u.createdAt
    }));

    return {
      output: {
        users,
        nextCursor: result.nextCursor
      },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();
