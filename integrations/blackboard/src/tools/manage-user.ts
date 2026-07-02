import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userNameSchema = z
  .object({
    given: z.string().optional().describe('First name'),
    family: z.string().optional().describe('Last name'),
    middle: z.string().optional().describe('Middle name'),
    title: z.string().optional().describe('Title (e.g., Mr., Dr.)'),
    suffix: z.string().optional().describe('Suffix (e.g., Jr., III)')
  })
  .optional();

let userContactSchema = z
  .object({
    email: z.string().optional().describe('Primary email address'),
    institutionEmail: z.string().optional().describe('Institution email address')
  })
  .optional();

let userOutputSchema = z.object({
  userId: z.string().describe('Internal user ID'),
  userName: z.string().describe('Username (login name)'),
  externalId: z.string().optional().describe('External identifier'),
  givenName: z.string().optional().describe('First name'),
  familyName: z.string().optional().describe('Last name'),
  email: z.string().optional().describe('Email address'),
  available: z.string().optional().describe('Availability status'),
  created: z.string().optional().describe('Creation timestamp'),
  modified: z.string().optional().describe('Last modified timestamp'),
  lastLogin: z.string().optional().describe('Last login timestamp')
});

let mapUser = (user: any) => ({
  userId: user.id,
  userName: user.userName,
  externalId: user.externalId,
  givenName: user.name?.given,
  familyName: user.name?.family,
  email: user.contact?.email,
  available: user.availability?.available,
  created: user.created,
  modified: user.modified,
  lastLogin: user.lastLogin
});

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new user account in Blackboard Learn. Requires a unique username. Optionally set name, email, roles, and availability.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      userName: z.string().describe('Unique username (login name)'),
      password: z.string().optional().describe('User password'),
      externalId: z.string().optional().describe('External identifier for SIS integration'),
      dataSourceId: z.string().optional().describe('Data source ID'),
      available: z.enum(['Yes', 'No', 'Disabled']).optional().describe('User availability'),
      name: userNameSchema,
      contact: userContactSchema,
      institutionRoleIds: z.array(z.string()).optional().describe('Institution role IDs'),
      systemRoleIds: z
        .array(z.string())
        .optional()
        .describe('System role IDs (e.g., "SystemAdmin")')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let user = await client.createUser({
      userName: ctx.input.userName,
      password: ctx.input.password,
      externalId: ctx.input.externalId,
      dataSourceId: ctx.input.dataSourceId,
      availability: ctx.input.available ? { available: ctx.input.available } : undefined,
      name: ctx.input.name,
      contact: ctx.input.contact,
      institutionRoleIds: ctx.input.institutionRoleIds,
      systemRoleIds: ctx.input.systemRoleIds
    });

    return {
      output: mapUser(user),
      message: `Created user **${user.userName}**${user.name?.given ? ` (${user.name.given} ${user.name.family || ''})` : ''}.`
    };
  })
  .build();

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a user's profile. Accepts the user's internal ID, external ID (prefixed with \`externalId:\`), or username (prefixed with \`userName:\`).`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      userId: z
        .string()
        .describe('User identifier — internal ID, "externalId:XXX", or "userName:XXX"')
    })
  )
  .output(
    userOutputSchema.extend({
      institutionRoleIds: z.array(z.string()).optional(),
      systemRoleIds: z.array(z.string()).optional(),
      address: z
        .object({
          street1: z.string().optional(),
          street2: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zipCode: z.string().optional(),
          country: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let user = await client.getUser(ctx.input.userId);

    return {
      output: {
        ...mapUser(user),
        institutionRoleIds: user.institutionRoleIds,
        systemRoleIds: user.systemRoleIds,
        address: user.address
      },
      message: `Retrieved user **${user.userName}**${user.name?.given ? ` (${user.name.given} ${user.name.family || ''})` : ''}.`
    };
  })
  .build();

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update a user account's properties. Only provided fields will be changed.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      userId: z
        .string()
        .describe('User identifier — internal ID, "externalId:XXX", or "userName:XXX"'),
      userName: z.string().optional().describe('New username'),
      password: z.string().optional().describe('New password'),
      externalId: z.string().optional().describe('External identifier'),
      dataSourceId: z.string().optional().describe('Data source ID'),
      available: z.enum(['Yes', 'No', 'Disabled']).optional().describe('User availability'),
      name: userNameSchema,
      contact: userContactSchema,
      institutionRoleIds: z.array(z.string()).optional().describe('Institution role IDs'),
      systemRoleIds: z.array(z.string()).optional().describe('System role IDs')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let { userId, available, ...rest } = ctx.input;

    let user = await client.updateUser(userId, {
      ...rest,
      availability: available ? { available } : undefined
    });

    return {
      output: mapUser(user),
      message: `Updated user **${user.userName}**.`
    };
  })
  .build();

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Permanently delete a user account from Blackboard Learn. This action cannot be undone.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      userId: z
        .string()
        .describe('User identifier — internal ID, "externalId:XXX", or "userName:XXX"')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the user was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    await client.deleteUser(ctx.input.userId);
    return {
      output: { deleted: true },
      message: `Deleted user **${ctx.input.userId}**.`
    };
  })
  .build();

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List user accounts in Blackboard Learn with optional filtering and pagination.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Number of items to skip'),
      limit: z.number().optional().describe('Maximum results to return (max 200)'),
      availability: z
        .enum(['Yes', 'No', 'Disabled'])
        .optional()
        .describe('Filter by availability'),
      dataSourceId: z.string().optional().describe('Filter by data source ID'),
      sort: z.string().optional().describe('Sort field (e.g., "userName", "lastLogin")')
    })
  )
  .output(
    z.object({
      users: z.array(userOutputSchema),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let result = await client.listUsers({
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      availability: ctx.input.availability,
      dataSourceId: ctx.input.dataSourceId,
      sort: ctx.input.sort
    });

    let users = (result.results || []).map(mapUser);

    return {
      output: { users, hasMore: !!result.paging?.nextPage },
      message: `Found **${users.length}** user(s).${result.paging?.nextPage ? ' More results available.' : ''}`
    };
  })
  .build();
