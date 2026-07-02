import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users on the n8n instance. Only available to the instance owner.`,
  constraints: ['Only the instance owner can list users.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
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
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.listUsers({
      includeRole: ctx.input.includeRole,
      projectId: ctx.input.projectId,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let users = (result.data || []).map((u: any) => ({
      userId: String(u.id),
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role || u.globalRole?.name,
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
