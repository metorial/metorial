import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in the Retool organization with optional filtering by email, first name, or last name. Supports pagination for large user bases.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter users by email address'),
      firstName: z.string().optional().describe('Filter users by first name'),
      lastName: z.string().optional().describe('Filter users by last name'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of users to return (1-100)'),
      nextToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous response to fetch the next page')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string(),
          email: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          active: z.boolean(),
          userType: z.string().optional(),
          createdAt: z.string().optional(),
          lastActive: z.string().optional()
        })
      ),
      totalCount: z.number(),
      hasMore: z.boolean(),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.listUsers({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      limit: ctx.input.limit,
      nextToken: ctx.input.nextToken
    });

    let users = result.data.map(u => ({
      userId: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      active: u.active,
      userType: u.user_type,
      createdAt: u.created_at,
      lastActive: u.last_active
    }));

    return {
      output: {
        users,
        totalCount: result.total_count,
        hasMore: result.has_more,
        nextToken: result.next_token
      },
      message: `Found **${result.total_count}** users. Returned **${users.length}** users${result.has_more ? ' (more available)' : ''}.`
    };
  })
  .build();
