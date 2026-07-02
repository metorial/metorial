import { SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

let userOutputSchema = z.object({
  userId: z.string().describe('User ID'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  displayName: z.string().optional().describe('Display name'),
  email: z.string().optional().describe('Email address'),
  isDisabled: z.boolean().optional().describe('Whether the user is disabled'),
  locale: z.string().optional().describe('User locale'),
  avatarUrl: z.string().optional().describe('Avatar URL'),
  personalFolderId: z.string().optional().describe('Personal folder ID'),
  roleIds: z.array(z.string()).optional().describe('Assigned role IDs'),
  groupIds: z.array(z.string()).optional().describe('Group IDs'),
  verifiedLookerEmployee: z
    .boolean()
    .optional()
    .describe('Whether a verified Looker employee'),
  presumedLookerEmployee: z.boolean().optional().describe('Whether a presumed Looker employee')
});

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Get, create, update, or delete a Looker user. Can also search for users by name or email, and manage user role assignments.`,
  instructions: [
    'To get a user: set action to "get" with userId.',
    'To get current user: set action to "get_me".',
    'To search: set action to "search" with email, firstName, or lastName.',
    'To create: set action to "create" with at least firstName and lastName.',
    'To update: set action to "update" with userId and fields to change.',
    'To delete: set action to "delete" with userId.',
    'To set roles: set action to "set_roles" with userId and roleIds.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['get', 'get_me', 'search', 'create', 'update', 'delete', 'set_roles'])
        .describe('Action to perform'),
      userId: z.string().optional().describe('User ID'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      isDisabled: z.boolean().optional().describe('Whether the user is disabled'),
      locale: z.string().optional().describe('User locale'),
      roleIds: z
        .array(z.string())
        .optional()
        .describe('Role IDs to assign (for set_roles action)'),
      page: z.number().optional().describe('Page number (for search)'),
      perPage: z.number().optional().describe('Results per page (for search)')
    })
  )
  .output(
    z.object({
      user: userOutputSchema.optional().describe('User details'),
      users: z.array(userOutputSchema).optional().describe('List of users (for search)'),
      count: z.number().optional().describe('Number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let mapUser = (u: any) => ({
      userId: String(u.id),
      firstName: u.first_name,
      lastName: u.last_name,
      displayName: u.display_name,
      email: u.email,
      isDisabled: u.is_disabled,
      locale: u.locale,
      avatarUrl: u.avatar_url,
      personalFolderId: u.personal_folder_id ? String(u.personal_folder_id) : undefined,
      roleIds: u.role_ids?.map((id: any) => String(id)),
      groupIds: u.group_ids?.map((id: any) => String(id)),
      verifiedLookerEmployee: u.verified_looker_employee,
      presumedLookerEmployee: u.presumed_looker_employee
    });

    switch (ctx.input.action) {
      case 'get': {
        if (!ctx.input.userId) throw new Error('userId is required');
        let user = await client.getUser(ctx.input.userId);
        return {
          output: { user: mapUser(user) },
          message: `Retrieved user **${user.display_name || user.email}**`
        };
      }
      case 'get_me': {
        let user = await client.getCurrentUser();
        return {
          output: { user: mapUser(user) },
          message: `Retrieved current user **${user.display_name || user.email}**`
        };
      }
      case 'search': {
        let results = await client.searchUsers({
          first_name: ctx.input.firstName,
          last_name: ctx.input.lastName,
          email: ctx.input.email,
          page: ctx.input.page,
          per_page: ctx.input.perPage,
          is_disabled: ctx.input.isDisabled
        });
        let users = (results || []).map(mapUser);
        return {
          output: { users, count: users.length },
          message: `Found **${users.length}** user(s)`
        };
      }
      case 'create': {
        let user = await client.createUser({
          first_name: ctx.input.firstName,
          last_name: ctx.input.lastName,
          is_disabled: ctx.input.isDisabled,
          locale: ctx.input.locale
        });
        return {
          output: { user: mapUser(user) },
          message: `Created user **${user.display_name || user.first_name}** (ID: ${user.id})`
        };
      }
      case 'update': {
        if (!ctx.input.userId) throw new Error('userId is required');
        let updateBody: Record<string, any> = {};
        if (ctx.input.firstName !== undefined) updateBody.first_name = ctx.input.firstName;
        if (ctx.input.lastName !== undefined) updateBody.last_name = ctx.input.lastName;
        if (ctx.input.isDisabled !== undefined) updateBody.is_disabled = ctx.input.isDisabled;
        if (ctx.input.locale !== undefined) updateBody.locale = ctx.input.locale;
        let user = await client.updateUser(ctx.input.userId, updateBody);
        return {
          output: { user: mapUser(user) },
          message: `Updated user **${user.display_name || user.email}**`
        };
      }
      case 'delete': {
        if (!ctx.input.userId) throw new Error('userId is required');
        let user = await client.getUser(ctx.input.userId);
        await client.deleteUser(ctx.input.userId);
        return {
          output: { user: mapUser(user) },
          message: `Deleted user **${user.display_name || user.email}** (ID: ${ctx.input.userId})`
        };
      }
      case 'set_roles': {
        if (!ctx.input.userId) throw new Error('userId is required');
        if (!ctx.input.roleIds) throw new Error('roleIds is required');
        await client.setUserRoles(ctx.input.userId, ctx.input.roleIds);
        let user = await client.getUser(ctx.input.userId);
        return {
          output: { user: mapUser(user) },
          message: `Updated roles for user **${user.display_name || user.email}**`
        };
      }
    }
  })
  .build();
