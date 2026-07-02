import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in the Datadog organization. Filter by status or search by name/email.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z.string().optional().describe('Search string to filter users by name or email'),
      filterStatus: z
        .enum(['Active', 'Pending', 'Disabled'])
        .optional()
        .describe('Filter by user status'),
      pageSize: z.number().optional().describe('Number of users per page (max 100)'),
      pageNumber: z.number().optional().describe('Page number for pagination'),
      sort: z.string().optional().describe('Sort field, e.g. "name", "email", "status"'),
      sortDir: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string(),
            name: z.string().optional(),
            email: z.string().optional(),
            handle: z.string().optional(),
            status: z.string().optional(),
            title: z.string().optional(),
            disabled: z.boolean().optional(),
            icon: z.string().optional(),
            createdAt: z.string().optional()
          })
        )
        .describe('List of users in the organization')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.listUsers(ctx.input);

    let users = (result.data || []).map((u: any) => ({
      userId: u.id,
      name: u.attributes?.name,
      email: u.attributes?.email,
      handle: u.attributes?.handle,
      status: u.attributes?.status,
      title: u.attributes?.title,
      disabled: u.attributes?.disabled,
      icon: u.attributes?.icon,
      createdAt: u.attributes?.created_at
    }));

    return {
      output: { users },
      message: `Found **${users.length}** users`
    };
  })
  .build();
