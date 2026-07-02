import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

let userOutputSchema = z.object({
  userId: z.string().describe('The user ID'),
  name: z.string().describe('The user name'),
  email: z.string().nullable().describe('The user email'),
  role: z.string().describe('The user role (end-user, agent, admin)'),
  organizationId: z.string().nullable().describe('The organization ID the user belongs to'),
  phone: z.string().nullable().describe('The user phone number'),
  tags: z.array(z.string()).describe('Tags on the user'),
  suspended: z.boolean().describe('Whether the user is suspended'),
  createdAt: z.string().describe('When the user was created'),
  updatedAt: z.string().describe('When the user was last updated')
});

let mapUser = (u: any) => ({
  userId: String(u.id),
  name: u.name,
  email: u.email || null,
  role: u.role,
  organizationId: u.organization_id ? String(u.organization_id) : null,
  phone: u.phone || null,
  tags: u.tags || [],
  suspended: u.suspended || false,
  createdAt: u.created_at,
  updatedAt: u.updated_at
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Lists users in Zendesk. Can filter by role (end-user, agent, admin). Use the **Search** tool for more complex user queries.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      role: z.enum(['end-user', 'agent', 'admin']).optional().describe('Filter users by role'),
      page: z.number().optional().default(1).describe('Page number'),
      perPage: z.number().optional().default(25).describe('Results per page (max 100)')
    })
  )
  .output(
    z.object({
      users: z.array(userOutputSchema),
      count: z.number(),
      nextPage: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let data = await client.listUsers({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      role: ctx.input.role
    });

    let users = (data.users || []).map(mapUser);

    return {
      output: {
        users,
        count: data.count || users.length,
        nextPage: data.next_page || null
      },
      message: `Found ${data.count || users.length} user(s), showing ${users.length} on this page.`
    };
  })
  .build();

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieves a single Zendesk user by their ID, including profile details, role, organization, and tags.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      userId: z.string().describe('The user ID to retrieve')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let user = await client.getUser(ctx.input.userId);

    return {
      output: mapUser(user),
      message: `User **${user.name}** (${user.email || 'no email'}) — Role: ${user.role}`
    };
  })
  .build();

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Creates a new user in Zendesk. Can create end-users, agents, or admins. Email is required for agent/admin roles.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Full name of the user'),
      email: z.string().optional().describe('Email address of the user'),
      role: z
        .enum(['end-user', 'agent', 'admin'])
        .optional()
        .default('end-user')
        .describe('Role of the user'),
      organizationId: z.string().optional().describe('Organization ID to assign the user to'),
      phone: z.string().optional().describe('Phone number'),
      tags: z.array(z.string()).optional().describe('Tags to add to the user'),
      verified: z.boolean().optional().describe('Whether to mark the user as verified'),
      externalId: z.string().optional().describe('External system ID')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let userData: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.email) userData.email = ctx.input.email;
    if (ctx.input.role) userData.role = ctx.input.role;
    if (ctx.input.organizationId) userData.organization_id = ctx.input.organizationId;
    if (ctx.input.phone) userData.phone = ctx.input.phone;
    if (ctx.input.tags) userData.tags = ctx.input.tags;
    if (ctx.input.verified !== undefined) userData.verified = ctx.input.verified;
    if (ctx.input.externalId) userData.external_id = ctx.input.externalId;

    let user = await client.createUser(userData);

    return {
      output: mapUser(user),
      message: `Created user **${user.name}** (${user.email || 'no email'}) with role: ${user.role}`
    };
  })
  .build();

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Updates an existing Zendesk user. Can modify name, email, role, organization, phone, tags, and suspension status.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      userId: z.string().describe('The user ID to update'),
      name: z.string().optional().describe('New name for the user'),
      email: z.string().optional().describe('New email address'),
      role: z.enum(['end-user', 'agent', 'admin']).optional().describe('New role'),
      organizationId: z.string().optional().describe('New organization ID'),
      phone: z.string().optional().describe('New phone number'),
      tags: z.array(z.string()).optional().describe('Replace all tags'),
      suspended: z.boolean().optional().describe('Whether the user should be suspended'),
      externalId: z.string().optional().describe('External system ID')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let userData: Record<string, any> = {};
    if (ctx.input.name !== undefined) userData.name = ctx.input.name;
    if (ctx.input.email !== undefined) userData.email = ctx.input.email;
    if (ctx.input.role !== undefined) userData.role = ctx.input.role;
    if (ctx.input.organizationId !== undefined)
      userData.organization_id = ctx.input.organizationId;
    if (ctx.input.phone !== undefined) userData.phone = ctx.input.phone;
    if (ctx.input.tags !== undefined) userData.tags = ctx.input.tags;
    if (ctx.input.suspended !== undefined) userData.suspended = ctx.input.suspended;
    if (ctx.input.externalId !== undefined) userData.external_id = ctx.input.externalId;

    let user = await client.updateUser(ctx.input.userId, userData);

    return {
      output: mapUser(user),
      message: `Updated user **${user.name}** (${user.email || 'no email'})`
    };
  })
  .build();

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Permanently deletes a user from Zendesk. This action cannot be undone.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      userId: z.string().describe('The user ID to delete')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The deleted user ID'),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    await client.deleteUser(ctx.input.userId);

    return {
      output: {
        userId: ctx.input.userId,
        deleted: true
      },
      message: `Deleted user **#${ctx.input.userId}**`
    };
  })
  .build();
