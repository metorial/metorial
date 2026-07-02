import {
  AttachRolePolicyCommand,
  AttachUserPolicyCommand,
  CreateRoleCommand,
  CreateUserCommand,
  DeleteRoleCommand,
  DeleteUserCommand,
  DetachRolePolicyCommand,
  DetachUserPolicyCommand,
  GetRoleCommand,
  GetUserCommand,
  ListAttachedRolePoliciesCommand,
  ListAttachedUserPoliciesCommand,
  ListRolesCommand,
  ListUsersCommand
} from '@aws-sdk/client-iam';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { awsServiceError } from '../lib/errors';
import { clientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let toIsoString = (value: unknown) => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value * 1000).toISOString();
  return undefined;
};

let parseUser = (user: any) => ({
  userName: user.UserName,
  userId: user.UserId,
  arn: user.Arn,
  path: user.Path,
  createDate: toIsoString(user.CreateDate),
  passwordLastUsed: toIsoString(user.PasswordLastUsed)
});

let parseRole = (role: any) => ({
  roleName: role.RoleName,
  roleId: role.RoleId,
  arn: role.Arn,
  path: role.Path,
  createDate: toIsoString(role.CreateDate),
  description: role.Description,
  maxSessionDuration:
    role.MaxSessionDuration !== undefined ? String(role.MaxSessionDuration) : undefined,
  assumeRolePolicyDocument: role.AssumeRolePolicyDocument
});

let parseAttachedPolicy = (policy: any) => ({
  policyName: policy.PolicyName,
  policyArn: policy.PolicyArn
});

let userSchema = z.object({
  userName: z.string().optional().describe('Name of the IAM user'),
  userId: z.string().optional().describe('Unique ID of the IAM user'),
  arn: z.string().optional().describe('ARN of the IAM user'),
  path: z.string().optional().describe('Path of the IAM user'),
  createDate: z.string().optional().describe('Date the user was created'),
  passwordLastUsed: z.string().optional().describe('Date the password was last used')
});

let roleSchema = z.object({
  roleName: z.string().optional().describe('Name of the IAM role'),
  roleId: z.string().optional().describe('Unique ID of the IAM role'),
  arn: z.string().optional().describe('ARN of the IAM role'),
  path: z.string().optional().describe('Path of the IAM role'),
  createDate: z.string().optional().describe('Date the role was created'),
  description: z.string().optional().describe('Description of the IAM role'),
  maxSessionDuration: z.string().optional().describe('Maximum session duration in seconds'),
  assumeRolePolicyDocument: z
    .string()
    .optional()
    .describe('Trust policy document (URL-encoded JSON)')
});

let attachedPolicySchema = z.object({
  policyName: z.string().optional().describe('Name of the attached policy'),
  policyArn: z.string().optional().describe('ARN of the attached policy')
});

export let manageIamTool = SlateTool.create(spec, {
  name: 'Manage IAM',
  key: 'manage_iam',
  description: `Manage AWS IAM users, roles, and policy attachments. Supports listing, creating, and deleting users; listing, creating, deleting, and inspecting roles; and attaching or detaching managed policies to users and roles.`,
  instructions: [
    'Use **operation** to select the action: list_users, get_user, create_user, delete_user, list_roles, get_role, create_role, delete_role, list_user_policies, list_role_policies, attach_user_policy, detach_user_policy, attach_role_policy, or detach_role_policy.',
    'For user operations, provide **userName**.',
    'For role operations, provide **roleName**.',
    'When creating a role, provide **assumeRolePolicyDocument** as a JSON trust policy string.',
    'For policy attach/detach operations, provide the target name (userName or roleName) and **policyArn**.',
    'When creating a user, optionally provide **path** and **tags**.',
    'List operations support pagination via **marker** and **maxItems**.'
  ],
  constraints: [
    'IAM is a global service; region configuration is not used for IAM calls.',
    'User and role names are case-insensitive for uniqueness but case-preserving.',
    'Deleting a user requires removing all attached policies, access keys, and group memberships first.',
    'Deleting a role requires removing attached policies and instance profile associations first.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      operation: z
        .enum([
          'list_users',
          'get_user',
          'create_user',
          'delete_user',
          'list_roles',
          'get_role',
          'create_role',
          'delete_role',
          'list_user_policies',
          'list_role_policies',
          'attach_user_policy',
          'detach_user_policy',
          'attach_role_policy',
          'detach_role_policy'
        ])
        .describe('The IAM operation to perform'),
      userName: z
        .string()
        .optional()
        .describe(
          'IAM user name. Required for user operations (get_user, create_user, delete_user, list_user_policies, attach_user_policy, detach_user_policy)'
        ),
      roleName: z
        .string()
        .optional()
        .describe(
          'IAM role name. Required for role operations (get_role, create_role, delete_role, list_role_policies, attach_role_policy, detach_role_policy)'
        ),
      assumeRolePolicyDocument: z
        .string()
        .optional()
        .describe('Trust policy JSON document for create_role'),
      roleDescription: z.string().optional().describe('Description for create_role'),
      maxSessionDuration: z
        .number()
        .optional()
        .describe('Maximum role session duration in seconds for create_role (3600-43200)'),
      permissionsBoundary: z
        .string()
        .optional()
        .describe('ARN of the policy used to set the permissions boundary for create_role'),
      policyArn: z
        .string()
        .optional()
        .describe(
          'Full ARN of the managed policy. Required for attach/detach operations (e.g., arn:aws:iam::aws:policy/ReadOnlyAccess)'
        ),
      path: z
        .string()
        .optional()
        .describe('Path for the new user (defaults to /). Used with create_user'),
      tags: z
        .array(
          z.object({
            key: z.string().describe('Tag key'),
            value: z.string().describe('Tag value')
          })
        )
        .optional()
        .describe('Tags to attach to the new user. Used with create_user'),
      maxItems: z
        .number()
        .optional()
        .describe('Maximum number of items to return (1-1000). Used with list operations'),
      marker: z
        .string()
        .optional()
        .describe('Pagination marker from a previous response. Used with list operations')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).optional().describe('List of IAM users'),
      user: userSchema.optional().describe('IAM user details'),
      roles: z.array(roleSchema).optional().describe('List of IAM roles'),
      role: roleSchema.optional().describe('IAM role details'),
      attachedPolicies: z
        .array(attachedPolicySchema)
        .optional()
        .describe('List of attached managed policies'),
      isTruncated: z.boolean().optional().describe('Whether there are more results available'),
      marker: z.string().optional().describe('Pagination marker for the next request'),
      created: z.boolean().optional().describe('Whether a user was created'),
      deleted: z.boolean().optional().describe('Whether a user was deleted'),
      attached: z.boolean().optional().describe('Whether a policy was attached'),
      detached: z.boolean().optional().describe('Whether a policy was detached')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFromContext(ctx);
    let {
      operation,
      userName,
      roleName,
      assumeRolePolicyDocument,
      roleDescription,
      maxSessionDuration,
      permissionsBoundary,
      policyArn,
      path,
      tags,
      maxItems,
      marker
    } = ctx.input;

    let tagList = tags?.map(tag => ({ Key: tag.key, Value: tag.value }));

    if (operation === 'list_users') {
      let response = await client.send('IAM ListUsers', () =>
        client.iam.send(new ListUsersCommand({ MaxItems: maxItems, Marker: marker }))
      );
      let users = (response.Users ?? []).map(parseUser).filter(user => user.userName);

      return {
        output: {
          users,
          isTruncated: response.IsTruncated,
          ...(response.IsTruncated && response.Marker ? { marker: response.Marker } : {})
        },
        message: `Found **${users.length}** IAM user(s)${response.IsTruncated ? ' (more available)' : ''}.`
      };
    }

    if (operation === 'get_user') {
      if (!userName) throw awsServiceError('userName is required for get_user operation.');
      let response = await client.send('IAM GetUser', () =>
        client.iam.send(new GetUserCommand({ UserName: userName }))
      );
      if (!response.User) throw awsServiceError(`User "${userName}" not found in response.`);
      let user = parseUser(response.User);

      return {
        output: { user },
        message: `Retrieved details for user **${userName}** (${user.arn}).`
      };
    }

    if (operation === 'create_user') {
      if (!userName) throw awsServiceError('userName is required for create_user operation.');
      let response = await client.send('IAM CreateUser', () =>
        client.iam.send(
          new CreateUserCommand({
            UserName: userName,
            Path: path,
            Tags: tagList
          })
        )
      );
      let user = response.User ? parseUser(response.User) : { userName, arn: undefined };

      return {
        output: { user, created: true },
        message: `Created IAM user **${userName}**${user.arn ? ` (${user.arn})` : ''}.`
      };
    }

    if (operation === 'delete_user') {
      if (!userName) throw awsServiceError('userName is required for delete_user operation.');
      await client.send('IAM DeleteUser', () =>
        client.iam.send(new DeleteUserCommand({ UserName: userName }))
      );

      return {
        output: { deleted: true },
        message: `Deleted IAM user **${userName}**.`
      };
    }

    if (operation === 'list_roles') {
      let response = await client.send('IAM ListRoles', () =>
        client.iam.send(new ListRolesCommand({ MaxItems: maxItems, Marker: marker }))
      );
      let roles = (response.Roles ?? []).map(parseRole).filter(role => role.roleName);

      return {
        output: {
          roles,
          isTruncated: response.IsTruncated,
          ...(response.IsTruncated && response.Marker ? { marker: response.Marker } : {})
        },
        message: `Found **${roles.length}** IAM role(s)${response.IsTruncated ? ' (more available)' : ''}.`
      };
    }

    if (operation === 'get_role') {
      if (!roleName) throw awsServiceError('roleName is required for get_role operation.');
      let response = await client.send('IAM GetRole', () =>
        client.iam.send(new GetRoleCommand({ RoleName: roleName }))
      );
      if (!response.Role) throw awsServiceError(`Role "${roleName}" not found in response.`);
      let role = parseRole(response.Role);

      return {
        output: { role },
        message: `Retrieved details for role **${roleName}** (${role.arn}).`
      };
    }

    if (operation === 'create_role') {
      if (!roleName) throw awsServiceError('roleName is required for create_role operation.');
      if (!assumeRolePolicyDocument) {
        throw awsServiceError(
          'assumeRolePolicyDocument is required for create_role operation.'
        );
      }

      let response = await client.send('IAM CreateRole', () =>
        client.iam.send(
          new CreateRoleCommand({
            RoleName: roleName,
            AssumeRolePolicyDocument: assumeRolePolicyDocument,
            Path: path,
            Description: roleDescription,
            MaxSessionDuration: maxSessionDuration,
            PermissionsBoundary: permissionsBoundary,
            Tags: tagList
          })
        )
      );
      let role = response.Role ? parseRole(response.Role) : { roleName, arn: undefined };

      return {
        output: { role, created: true },
        message: `Created IAM role **${roleName}**${role.arn ? ` (${role.arn})` : ''}.`
      };
    }

    if (operation === 'delete_role') {
      if (!roleName) throw awsServiceError('roleName is required for delete_role operation.');
      await client.send('IAM DeleteRole', () =>
        client.iam.send(new DeleteRoleCommand({ RoleName: roleName }))
      );

      return {
        output: { deleted: true },
        message: `Deleted IAM role **${roleName}**.`
      };
    }

    if (operation === 'list_user_policies') {
      if (!userName)
        throw awsServiceError('userName is required for list_user_policies operation.');
      let response = await client.send('IAM ListAttachedUserPolicies', () =>
        client.iam.send(
          new ListAttachedUserPoliciesCommand({
            UserName: userName,
            MaxItems: maxItems,
            Marker: marker
          })
        )
      );
      let attachedPolicies = (response.AttachedPolicies ?? [])
        .map(parseAttachedPolicy)
        .filter(policy => policy.policyArn);

      return {
        output: {
          attachedPolicies,
          isTruncated: response.IsTruncated,
          ...(response.IsTruncated && response.Marker ? { marker: response.Marker } : {})
        },
        message: `Found **${attachedPolicies.length}** attached policy(ies) for user **${userName}**${response.IsTruncated ? ' (more available)' : ''}.`
      };
    }

    if (operation === 'list_role_policies') {
      if (!roleName)
        throw awsServiceError('roleName is required for list_role_policies operation.');
      let response = await client.send('IAM ListAttachedRolePolicies', () =>
        client.iam.send(
          new ListAttachedRolePoliciesCommand({
            RoleName: roleName,
            MaxItems: maxItems,
            Marker: marker
          })
        )
      );
      let attachedPolicies = (response.AttachedPolicies ?? [])
        .map(parseAttachedPolicy)
        .filter(policy => policy.policyArn);

      return {
        output: {
          attachedPolicies,
          isTruncated: response.IsTruncated,
          ...(response.IsTruncated && response.Marker ? { marker: response.Marker } : {})
        },
        message: `Found **${attachedPolicies.length}** attached policy(ies) for role **${roleName}**${response.IsTruncated ? ' (more available)' : ''}.`
      };
    }

    if (operation === 'attach_user_policy') {
      if (!userName)
        throw awsServiceError('userName is required for attach_user_policy operation.');
      if (!policyArn)
        throw awsServiceError('policyArn is required for attach_user_policy operation.');
      await client.send('IAM AttachUserPolicy', () =>
        client.iam.send(
          new AttachUserPolicyCommand({ UserName: userName, PolicyArn: policyArn })
        )
      );

      return {
        output: { attached: true },
        message: `Attached policy \`${policyArn}\` to user **${userName}**.`
      };
    }

    if (operation === 'detach_user_policy') {
      if (!userName)
        throw awsServiceError('userName is required for detach_user_policy operation.');
      if (!policyArn)
        throw awsServiceError('policyArn is required for detach_user_policy operation.');
      await client.send('IAM DetachUserPolicy', () =>
        client.iam.send(
          new DetachUserPolicyCommand({ UserName: userName, PolicyArn: policyArn })
        )
      );

      return {
        output: { detached: true },
        message: `Detached policy \`${policyArn}\` from user **${userName}**.`
      };
    }

    if (operation === 'attach_role_policy') {
      if (!roleName)
        throw awsServiceError('roleName is required for attach_role_policy operation.');
      if (!policyArn)
        throw awsServiceError('policyArn is required for attach_role_policy operation.');
      await client.send('IAM AttachRolePolicy', () =>
        client.iam.send(
          new AttachRolePolicyCommand({ RoleName: roleName, PolicyArn: policyArn })
        )
      );

      return {
        output: { attached: true },
        message: `Attached policy \`${policyArn}\` to role **${roleName}**.`
      };
    }

    if (operation === 'detach_role_policy') {
      if (!roleName)
        throw awsServiceError('roleName is required for detach_role_policy operation.');
      if (!policyArn)
        throw awsServiceError('policyArn is required for detach_role_policy operation.');
      await client.send('IAM DetachRolePolicy', () =>
        client.iam.send(
          new DetachRolePolicyCommand({ RoleName: roleName, PolicyArn: policyArn })
        )
      );

      return {
        output: { detached: true },
        message: `Detached policy \`${policyArn}\` from role **${roleName}**.`
      };
    }

    throw awsServiceError(`Unknown operation: ${operation}`);
  })
  .build();
