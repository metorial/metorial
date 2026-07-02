import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { accountIdInput, createDbtCloudClient } from './common';

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users in the dbt Cloud account. Returns user names, email addresses, and license information. Useful for auditing account membership and permissions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...accountIdInput,
      limit: z.number().optional().describe('Maximum number of users to return (max 100)'),
      offset: z.number().optional().describe('Number of users to skip for pagination')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.number().describe('Unique user identifier'),
            name: z.string().nullable().optional().describe('User full name'),
            email: z.string().describe('User email address'),
            isActive: z.boolean().optional().describe('Whether the user is active'),
            permissions: z.array(z.any()).optional().describe('User permission assignments')
          })
        )
        .describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDbtCloudClient(ctx);

    let users = await client.listUsers({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = users.map((u: any) => ({
      userId: u.id,
      name: u.name ?? u.fullname ?? null,
      email: u.email,
      isActive: u.is_active,
      permissions: u.permissions
    }));

    return {
      output: { users: mapped },
      message: `Found **${mapped.length}** user(s).`
    };
  })
  .build();
