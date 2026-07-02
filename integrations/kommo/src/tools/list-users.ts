import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { spec } from '../spec';

let userOutputSchema = z.object({
  userId: z.number().describe('User ID'),
  name: z.string().optional().describe('User name'),
  email: z.string().optional().describe('User email'),
  lang: z.string().optional().describe('User language'),
  isAdmin: z.boolean().optional().describe('Whether user is an admin'),
  isActive: z.boolean().optional().describe('Whether user is active'),
  roleId: z.number().optional().describe('Role ID'),
  groupId: z.number().optional().describe('Group ID')
});

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List account users or get a specific user by ID. Returns user details including name, email, role, and admin status. Use this to find user IDs for assigning leads, contacts, or tasks.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      userId: z
        .number()
        .optional()
        .describe('Get a specific user by ID. If omitted, returns all users.'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page (max 250)')
    })
  )
  .output(
    z.object({
      users: z.array(userOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    if (ctx.input.userId) {
      let user = await client.getUser(ctx.input.userId);
      let mapped = {
        userId: user.id,
        name: user.name,
        email: user.email,
        lang: user.lang,
        isAdmin: user.is_admin,
        isActive: user.is_active,
        roleId: user.role_id,
        groupId: user.group_id
      };
      return {
        output: { users: [mapped] },
        message: `Retrieved user **${user.name}** (ID: ${user.id}).`
      };
    }

    let users = await client.listUsers({ page: ctx.input.page, limit: ctx.input.limit });

    let mapped = users.map((u: any) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      lang: u.lang,
      isAdmin: u.is_admin,
      isActive: u.is_active,
      roleId: u.role_id,
      groupId: u.group_id
    }));

    return {
      output: { users: mapped },
      message: `Found **${mapped.length}** user(s).`
    };
  })
  .build();
