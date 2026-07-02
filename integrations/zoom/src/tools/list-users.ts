import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in the Zoom account. Supports filtering by status (active, inactive, pending) and pagination. Requires admin-level scopes for listing all users.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['active', 'inactive', 'pending'])
        .optional()
        .describe('Filter by user status'),
      pageSize: z.number().optional().describe('Number of records per page (max 300)'),
      nextPageToken: z.string().optional().describe('Pagination token for next page'),
      roleId: z.string().optional().describe('Filter by role ID')
    })
  )
  .output(
    z.object({
      totalRecords: z.number().optional().describe('Total number of users'),
      nextPageToken: z.string().optional().describe('Token for next page'),
      users: z
        .array(
          z.object({
            odataUserId: z.string().describe('User ID'),
            email: z.string().describe('User email'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            displayName: z.string().optional().describe('Display name'),
            type: z.number().describe('User type: 1=basic, 2=licensed, 3=on-prem'),
            status: z.string().optional().describe('User status'),
            createdAt: z.string().optional().describe('Account creation time'),
            lastLoginTime: z.string().optional().describe('Last login time'),
            roleName: z.string().optional().describe('Role name')
          })
        )
        .describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);
    let result = await client.listUsers({
      status: ctx.input.status,
      pageSize: ctx.input.pageSize,
      nextPageToken: ctx.input.nextPageToken,
      roleId: ctx.input.roleId
    });

    let users = (result.users || []).map((u: any) => ({
      odataUserId: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      displayName: u.display_name,
      type: u.type,
      status: u.status,
      createdAt: u.created_at,
      lastLoginTime: u.last_login_time,
      roleName: u.role_name
    }));

    return {
      output: {
        totalRecords: result.total_records,
        nextPageToken: result.next_page_token || undefined,
        users
      },
      message: `Found **${users.length}** user(s)${result.total_records ? ` of ${result.total_records} total` : ''}.`
    };
  })
  .build();
