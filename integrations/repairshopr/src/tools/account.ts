import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Who Am I',
  key: 'who_am_i',
  description:
    'Retrieve the connected RepairShopr user, account subdomain, and available permissions.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('Connected user ID'),
      name: z.string().optional().describe('Connected user name'),
      email: z.string().optional().describe('Connected user email'),
      subdomain: z.string().optional().describe('Account subdomain'),
      admin: z.boolean().optional().describe('Whether the connected user is an administrator'),
      permissions: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Available resource permissions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let user = await client.getCurrentUser();
    return {
      output: {
        userId: user.user_id,
        name: user.user_name ?? undefined,
        email: user.user_email ?? undefined,
        subdomain: user.subdomain ?? undefined,
        admin: user.admin ?? undefined,
        permissions: user.permissions ?? undefined
      },
      message: `Connected as **${user.user_name || user.user_email || user.user_id}**.`
    };
  })
  .build();

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description:
    'List authorized users and technician IDs for assigning tickets, leads, and appointments.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(z.object({ userId: z.number(), name: z.string().optional() })),
      totalPages: z.number().optional(),
      totalEntries: z.number().optional(),
      page: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.listUsers();
    let users = (result.users || []).map((user: [number, string]) => ({
      userId: user[0],
      name: user[1] ?? undefined
    }));
    return {
      output: {
        users,
        totalPages: result.meta?.total_pages,
        totalEntries: result.meta?.total_entries,
        page: result.meta?.page
      },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();
