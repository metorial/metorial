import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List enterprise users in Box, optionally filtering by name or login. Can also retrieve the current authenticated user's details.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      filterTerm: z
        .string()
        .optional()
        .describe('Filter by user name or login (partial match)'),
      userType: z
        .enum(['all', 'managed', 'external'])
        .optional()
        .describe('Filter by user type'),
      limit: z.number().optional().describe('Maximum number of users to return'),
      offset: z.number().optional().describe('Offset for pagination'),
      currentUserOnly: z
        .boolean()
        .optional()
        .describe('If true, only return the currently authenticated user')
    })
  )
  .output(
    z.object({
      totalCount: z.number().optional().describe('Total number of matching users'),
      users: z.array(
        z.object({
          userId: z.string().describe('User ID'),
          name: z.string().describe('Full name'),
          login: z.string().describe('Email/login'),
          status: z.string().optional().describe('Account status (active, inactive, etc.)'),
          role: z.string().optional().describe('User role (admin, coadmin, user)'),
          spaceUsed: z.number().optional().describe('Storage space used in bytes'),
          spaceAmount: z.number().optional().describe('Total available storage in bytes'),
          createdAt: z.string().optional().describe('ISO 8601 account creation timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.currentUserOnly) {
      let user = await client.getCurrentUser([
        'id',
        'name',
        'login',
        'status',
        'role',
        'space_used',
        'space_amount',
        'created_at'
      ]);
      return {
        output: {
          totalCount: 1,
          users: [
            {
              userId: user.id,
              name: user.name,
              login: user.login,
              status: user.status,
              role: user.role,
              spaceUsed: user.space_used,
              spaceAmount: user.space_amount,
              createdAt: user.created_at
            }
          ]
        },
        message: `Current user: **${user.name}** (${user.login}).`
      };
    }

    let data = await client.listUsers({
      filterTerm: ctx.input.filterTerm,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      userType: ctx.input.userType
    });

    let users = (data.entries || []).map((u: any) => ({
      userId: u.id,
      name: u.name,
      login: u.login,
      status: u.status,
      role: u.role,
      spaceUsed: u.space_used,
      spaceAmount: u.space_amount,
      createdAt: u.created_at
    }));

    return {
      output: {
        totalCount: data.total_count || 0,
        users
      },
      message: `Found ${data.total_count || 0} user(s)${ctx.input.filterTerm ? ` matching "${ctx.input.filterTerm}"` : ''}.`
    };
  });
