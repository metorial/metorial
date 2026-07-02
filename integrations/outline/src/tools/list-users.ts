import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List workspace members with optional filtering by name, role, or status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search users by name'),
      role: z.enum(['admin', 'member', 'viewer']).optional().describe('Filter by role'),
      filter: z
        .enum(['all', 'invited', 'active', 'suspended'])
        .optional()
        .describe('Filter by account status'),
      limit: z.number().optional().default(25).describe('Maximum number of users to return'),
      offset: z.number().optional().default(0).describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string(),
          name: z.string(),
          email: z.string().optional(),
          avatarUrl: z.string().optional(),
          role: z.string(),
          isSuspended: z.boolean(),
          isAdmin: z.boolean(),
          lastActiveAt: z.string().optional(),
          createdAt: z.string()
        })
      ),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listUsers({
      query: ctx.input.query,
      role: ctx.input.role,
      filter: ctx.input.filter,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let users = (result.data || []).map(u => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
      role: u.role,
      isSuspended: u.isSuspended,
      isAdmin: u.isAdmin,
      lastActiveAt: u.lastActiveAt,
      createdAt: u.createdAt
    }));

    return {
      output: {
        users,
        total: users.length
      },
      message: `Found **${users.length}** users.`
    };
  })
  .build();
