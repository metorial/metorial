import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in the OpsGenie account. Supports filtering, pagination, and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Filter query (e.g., "role:admin")'),
      limit: z
        .number()
        .optional()
        .describe('Number of users to return (max 100, default 100)'),
      offset: z.number().optional().describe('Start index for pagination'),
      sort: z
        .enum(['username', 'fullName', 'createdAt'])
        .optional()
        .describe('Field to sort by'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string().describe('User ID'),
          username: z.string().describe('User email'),
          fullName: z.string().describe('Full name'),
          role: z.string().optional().describe('User role'),
          blocked: z.boolean().optional().describe('Whether the user is blocked'),
          verified: z.boolean().optional().describe('Whether the user is verified'),
          createdAt: z.string().optional().describe('Account creation time'),
          timezone: z.string().optional().describe('User timezone')
        })
      ),
      totalCount: z.number().describe('Number of users returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let response = await client.listUsers(ctx.input);
    let data = response.data ?? [];

    let users = data.map((u: any) => ({
      userId: u.id,
      username: u.username,
      fullName: u.fullName,
      role: u.role?.name ?? u.role,
      blocked: u.blocked,
      verified: u.verified,
      createdAt: u.createdAt,
      timezone: u.timeZone ?? u.timezone
    }));

    return {
      output: {
        users,
        totalCount: users.length
      },
      message: `Found **${users.length}** users${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  })
  .build();
