import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description:
    'List or search users in the connected Zep project to discover user IDs for managing threads, adding data, and searching user graphs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number starting at 1'),
      pageSize: z.number().optional().describe('Number of users per page'),
      search: z.string().optional().describe('Filter by user ID, name, or email'),
      orderBy: z
        .enum(['created_at', 'user_id', 'email'])
        .optional()
        .describe('Field to order users by'),
      ascending: z.boolean().optional().describe('Sort in ascending order')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().optional().describe('Application user ID'),
            uuid: z.string().optional().describe('Internal user UUID'),
            email: z.string().optional().nullable().describe('Email address'),
            firstName: z.string().optional().nullable().describe('First name'),
            lastName: z.string().optional().nullable().describe('Last name'),
            createdAt: z.string().optional().nullable().describe('Creation timestamp'),
            updatedAt: z.string().optional().nullable().describe('Last update timestamp'),
            metadata: z
              .record(z.string(), z.unknown())
              .optional()
              .nullable()
              .describe('User metadata')
          })
        )
        .describe('Users in this page'),
      totalCount: z.number().optional().describe('Total matching users'),
      rowCount: z.number().optional().describe('Number of users returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let result = await client.listUsers(ctx.input);
    let users = (result.users ?? []).map(user => ({
      userId: user.user_id,
      uuid: user.uuid,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      metadata: user.metadata
    }));
    return {
      output: { users, totalCount: result.total_count, rowCount: result.row_count },
      message: `Retrieved **${users.length}** user(s).`
    };
  })
  .build();
