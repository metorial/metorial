import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  LookerClient,
  type LookerRole,
  type LookerUser,
  type LookerWriteEmailCredentials,
  type LookerWriteUser
} from '../lib/client';
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
  homeFolderId: z.string().optional().describe('Home folder ID'),
  personalFolderId: z.string().optional().describe('Personal folder ID'),
  roleIds: z.array(z.string()).optional().describe('Assigned role IDs'),
  groupIds: z.array(z.string()).optional().describe('Group IDs'),
  modelsDirValidated: z
    .boolean()
    .optional()
    .describe('Whether the development workspace models directory was validated'),
  uiState: z.record(z.string(), z.unknown()).optional().describe('Per-user Looker UI state'),
  canManageApi3Creds: z
    .boolean()
    .optional()
    .describe('Whether the user can manage API3 credentials'),
  isServiceAccount: z.boolean().optional().describe('Whether this is a service account'),
  rolesExternallyManaged: z
    .boolean()
    .optional()
    .describe('Whether roles are managed by an external directory'),
  allowDirectRoles: z.boolean().optional().describe('Whether roles can be assigned directly'),
  verifiedLookerEmployee: z
    .boolean()
    .optional()
    .describe('Whether a verified Looker employee'),
  presumedLookerEmployee: z.boolean().optional().describe('Whether a presumed Looker employee')
});

let roleOutputSchema = z.object({
  roleId: z.string().describe('Role ID'),
  name: z.string().optional().describe('Role name')
});

let manageUserInputSchema = z.object({
  action: z
    .enum(['get', 'get_me', 'search', 'create', 'update', 'delete', 'set_roles'])
    .describe('Action to perform'),
  userId: z
    .string()
    .optional()
    .describe(
      'User ID (required for get, update, delete, and set_roles; optional search filter)'
    ),
  firstName: z.string().optional().describe('First name or search pattern'),
  lastName: z.string().optional().describe('Last name or search pattern'),
  fullName: z.string().optional().describe('Full-name search pattern (for search)'),
  email: z
    .string()
    .optional()
    .describe('Email search pattern, or email credential for create/update'),
  forcedPasswordResetAtNextLogin: z
    .boolean()
    .optional()
    .describe('Force a password reset at next email/password login (for create/update)'),
  isDisabled: z
    .boolean()
    .optional()
    .describe('Whether the user is disabled, or disabled-state filter for search'),
  locale: z.string().optional().describe('User locale (for create/update)'),
  homeFolderId: z.string().optional().describe('Home folder ID (for create/update)'),
  modelsDirValidated: z
    .boolean()
    .optional()
    .describe(
      'Whether the development workspace models directory was validated (create/update)'
    ),
  uiState: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Per-user Looker UI state (for create/update)'),
  canManageApi3Creds: z
    .boolean()
    .optional()
    .describe('Whether the user can manage API3 credentials (create/update or search filter)'),
  verifiedLookerEmployee: z
    .boolean()
    .optional()
    .describe('Filter for verified Looker employee accounts (for search)'),
  embedUser: z.boolean().optional().describe('Filter for embed users (for search)'),
  isServiceAccount: z
    .boolean()
    .optional()
    .describe('Filter for service-account users (for search)'),
  contentMetadataId: z
    .string()
    .optional()
    .describe('Filter for users with access to a content metadata item (for search)'),
  groupId: z
    .string()
    .optional()
    .describe('Filter for users who are direct members of a group (for search)'),
  filterOr: z
    .boolean()
    .optional()
    .describe('Combine search filters with OR instead of the default AND'),
  sorts: z.string().optional().describe('Comma-separated user fields to sort by (for search)'),
  roleIds: z
    .array(z.string())
    .optional()
    .describe(
      'Complete role ID list to assign; an empty list removes direct roles (set_roles)'
    ),
  limit: z.number().int().min(0).optional().describe('Maximum results to return (for search)'),
  offset: z.number().int().min(0).optional().describe('Results to skip (for search)'),
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Deprecated page number for search; use limit and offset'),
  perPage: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Deprecated results per page for search; use limit and offset')
});

type ManageUserInput = z.infer<typeof manageUserInputSchema>;

let buildWriteUser = (input: ManageUserInput): LookerWriteUser => {
  let body: LookerWriteUser = {};

  if (input.firstName !== undefined) body.first_name = input.firstName;
  if (input.homeFolderId !== undefined) body.home_folder_id = input.homeFolderId;
  if (input.isDisabled !== undefined) body.is_disabled = input.isDisabled;
  if (input.lastName !== undefined) body.last_name = input.lastName;
  if (input.locale !== undefined) body.locale = input.locale;
  if (input.modelsDirValidated !== undefined) {
    body.models_dir_validated = input.modelsDirValidated;
  }
  if (input.uiState !== undefined) body.ui_state = input.uiState;
  if (input.canManageApi3Creds !== undefined) {
    body.can_manage_api3_creds = input.canManageApi3Creds;
  }

  return body;
};

let buildWriteEmailCredentials = (input: ManageUserInput): LookerWriteEmailCredentials => {
  let body: LookerWriteEmailCredentials = {};

  if (input.email !== undefined) body.email = input.email;
  if (input.forcedPasswordResetAtNextLogin !== undefined) {
    body.forced_password_reset_at_next_login = input.forcedPasswordResetAtNextLogin;
  }

  return body;
};

let mapUser = (user: LookerUser) => {
  if (typeof user?.id !== 'string' || user.id.length === 0) {
    throw createApiServiceError('Looker returned a user without an ID.', {
      reason: 'looker_user_response_invalid'
    });
  }

  return {
    userId: user.id,
    firstName: user.first_name ?? undefined,
    lastName: user.last_name ?? undefined,
    displayName: user.display_name ?? undefined,
    email: user.email ?? undefined,
    isDisabled: user.is_disabled ?? undefined,
    locale: user.locale ?? undefined,
    avatarUrl: user.avatar_url ?? undefined,
    homeFolderId: user.home_folder_id ?? undefined,
    personalFolderId: user.personal_folder_id ?? undefined,
    roleIds: user.role_ids ?? undefined,
    groupIds: user.group_ids ?? undefined,
    modelsDirValidated: user.models_dir_validated ?? undefined,
    uiState: user.ui_state ?? undefined,
    canManageApi3Creds: user.can_manage_api3_creds ?? undefined,
    isServiceAccount: user.is_service_account ?? undefined,
    rolesExternallyManaged: user.roles_externally_managed ?? undefined,
    allowDirectRoles: user.allow_direct_roles ?? undefined,
    verifiedLookerEmployee: user.verified_looker_employee ?? undefined,
    presumedLookerEmployee: user.presumed_looker_employee ?? undefined
  };
};

let mapRole = (role: LookerRole) => {
  if (typeof role?.id !== 'string' || role.id.length === 0) {
    throw createApiServiceError('Looker returned a role without an ID.', {
      reason: 'looker_role_response_invalid'
    });
  }

  return {
    roleId: role.id,
    name: role.name ?? undefined
  };
};

let userLabel = (user: ReturnType<typeof mapUser>) =>
  user.displayName ?? user.email ?? user.firstName ?? user.userId;

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Get, create, update, or delete a Looker user. Can also search for users by name or email, and manage user role assignments.`,
  instructions: [
    'To get a user: set action to "get" with userId.',
    'To get current user: set action to "get_me".',
    'To search: set action to "search" with any documented filter; use limit and offset for pagination.',
    'To create: set action to "create" with the user fields to initialize.',
    'To create email/password credentials, include email when creating the user.',
    'To update: set action to "update" with userId and fields or email credentials to change.',
    'To permanently delete a regular user: set action to "delete" with userId. Looker does not allow deleting the current user or last administrator, and this endpoint is deprecated for service accounts.',
    'To replace direct role assignments: set action to "set_roles" with userId and the complete roleIds list; pass [] to clear direct roles.'
  ]
})
  .input(manageUserInputSchema)
  .output(
    z.object({
      user: userOutputSchema.optional().describe('User details'),
      users: z.array(userOutputSchema).optional().describe('List of users (for search)'),
      roles: z
        .array(roleOutputSchema)
        .optional()
        .describe('Roles returned by the set_roles action'),
      count: z.number().optional().describe('Number of users returned on this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'get': {
        if (!ctx.input.userId) {
          throw createApiServiceError('userId is required for get action.', {
            reason: 'looker_manage_user_id_required'
          });
        }
        let user = mapUser(await client.getUser(ctx.input.userId));
        return {
          output: { user },
          message: `Retrieved user **${userLabel(user)}**`
        };
      }
      case 'get_me': {
        let user = mapUser(await client.getCurrentUser());
        return {
          output: { user },
          message: `Retrieved current user **${userLabel(user)}**`
        };
      }
      case 'search': {
        let results = await client.searchUsers({
          id: ctx.input.userId,
          first_name: ctx.input.firstName,
          last_name: ctx.input.lastName,
          full_name: ctx.input.fullName,
          verified_looker_employee: ctx.input.verifiedLookerEmployee,
          embed_user: ctx.input.embedUser,
          email: ctx.input.email,
          is_disabled: ctx.input.isDisabled,
          filter_or: ctx.input.filterOr,
          content_metadata_id: ctx.input.contentMetadataId,
          group_id: ctx.input.groupId,
          can_manage_api3_creds: ctx.input.canManageApi3Creds,
          is_service_account: ctx.input.isServiceAccount,
          sorts: ctx.input.sorts,
          limit: ctx.input.limit,
          offset: ctx.input.offset,
          page: ctx.input.page,
          per_page: ctx.input.perPage
        });
        if (!Array.isArray(results)) {
          throw createApiServiceError('Looker returned an invalid user search response.', {
            reason: 'looker_user_search_response_invalid'
          });
        }
        let users = results.map(mapUser);
        return {
          output: { users, count: users.length },
          message: `Found **${users.length}** user(s)`
        };
      }
      case 'create': {
        let credentialsBody = buildWriteEmailCredentials(ctx.input);
        if (
          ctx.input.forcedPasswordResetAtNextLogin !== undefined &&
          ctx.input.email === undefined
        ) {
          throw createApiServiceError(
            'email is required when creating email credentials for a new user.',
            { reason: 'looker_manage_user_create_email_required' }
          );
        }

        let user = mapUser(await client.createUser(buildWriteUser(ctx.input)));
        if (Object.keys(credentialsBody).length > 0) {
          await client.createUserEmailCredentials(user.userId, credentialsBody);
          user = mapUser(await client.getUser(user.userId));
        }
        return {
          output: { user },
          message: `Created user **${userLabel(user)}** (ID: ${user.userId})`
        };
      }
      case 'update': {
        if (!ctx.input.userId) {
          throw createApiServiceError('userId is required for update action.', {
            reason: 'looker_manage_user_id_required'
          });
        }
        let updateBody = buildWriteUser(ctx.input);
        let credentialsBody = buildWriteEmailCredentials(ctx.input);
        if (
          Object.keys(updateBody).length === 0 &&
          Object.keys(credentialsBody).length === 0
        ) {
          throw createApiServiceError('Provide at least one user field to update.', {
            reason: 'looker_manage_user_update_fields_required'
          });
        }
        if (Object.keys(updateBody).length > 0) {
          await client.updateUser(ctx.input.userId, updateBody);
        }
        if (Object.keys(credentialsBody).length > 0) {
          await client.updateUserEmailCredentials(ctx.input.userId, credentialsBody);
        }
        let user = mapUser(await client.getUser(ctx.input.userId));
        return {
          output: { user },
          message: `Updated user **${userLabel(user)}**`
        };
      }
      case 'delete': {
        if (!ctx.input.userId) {
          throw createApiServiceError('userId is required for delete action.', {
            reason: 'looker_manage_user_id_required'
          });
        }
        let user = mapUser(await client.getUser(ctx.input.userId));
        await client.deleteUser(ctx.input.userId);
        return {
          output: { user },
          message: `Permanently deleted user **${userLabel(user)}** (ID: ${user.userId})`
        };
      }
      case 'set_roles': {
        if (!ctx.input.userId) {
          throw createApiServiceError('userId is required for set_roles action.', {
            reason: 'looker_manage_user_id_required'
          });
        }
        if (ctx.input.roleIds === undefined) {
          throw createApiServiceError('roleIds is required for set_roles action.', {
            reason: 'looker_manage_user_role_ids_required'
          });
        }
        let rolesResponse = await client.setUserRoles(ctx.input.userId, ctx.input.roleIds);
        if (!Array.isArray(rolesResponse)) {
          throw createApiServiceError('Looker returned an invalid role assignment response.', {
            reason: 'looker_user_roles_response_invalid'
          });
        }
        let roles = rolesResponse.map(mapRole);
        let user = mapUser(await client.getUser(ctx.input.userId));
        user.roleIds = roles.map(role => role.roleId);
        return {
          output: { user, roles },
          message: `Updated roles for user **${userLabel(user)}**`
        };
      }
    }
  })
  .build();
