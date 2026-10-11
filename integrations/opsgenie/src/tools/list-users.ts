import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { getNextNumericOffset } from '../lib/paging';
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
      query: z
        .string()
        .optional()
        .describe(
          'Filter query of field:value pairs (e.g., "role:admin", "blocked:false"). Fields: username, fullName, blocked, verified, role, locale, timeZone, createdAt'
        ),
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
      totalCount: z.number().describe('Number of users returned'),
      totalAvailable: z
        .number()
        .optional()
        .describe('Total number of users matching the query'),
      hasMore: z.boolean().describe('Whether another page of users is available'),
      nextOffset: z
        .number()
        .optional()
        .describe('Offset to pass to fetch the next page, when more users are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let response = await client.listUsers(ctx.input);
    let data = response.data ?? [];
    let nextOffset = getNextNumericOffset(response.paging);

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
        totalCount: users.length,
        totalAvailable:
          typeof response.totalCount === 'number' ? response.totalCount : undefined,
        hasMore: nextOffset !== undefined,
        nextOffset
      },
      message: `Found **${users.length}** users${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  })
  .build();
