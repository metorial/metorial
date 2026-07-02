import { SlateTool } from 'slates';
import { z } from 'zod';
import { cognitoServiceError } from '../lib/errors';
import { createCognitoClient, formatAttributes, toAttributeList } from '../lib/helpers';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, get, update, disable, enable, confirm, reset password, set password, or delete a user in a Cognito user pool. Combines all administrative user operations into a single flexible tool.`,
  instructions: [
    'Custom attributes must be prefixed with "custom:" in the attributes object.',
    'When creating a user, if temporaryPassword is omitted, Cognito auto-generates one.',
    'The "set_password" action sets a user password directly without requiring the old password.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'get',
          'update_attributes',
          'delete',
          'disable',
          'enable',
          'confirm',
          'reset_password',
          'set_password'
        ])
        .describe('Operation to perform on the user'),
      userPoolId: z.string().describe('User pool ID'),
      username: z.string().describe('Username of the target user'),
      attributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('User attributes as key-value pairs (for create and update_attributes)'),
      temporaryPassword: z
        .string()
        .optional()
        .describe('Temporary password for the user (for create action)'),
      password: z.string().optional().describe('New password (for set_password action)'),
      permanent: z
        .boolean()
        .optional()
        .describe('Whether the password is permanent (for set_password, default true)'),
      suppressMessage: z
        .boolean()
        .optional()
        .describe('Suppress the invitation message (for create action)'),
      desiredDeliveryMediums: z
        .array(z.enum(['EMAIL', 'SMS']))
        .optional()
        .describe('How to deliver the invitation (for create action)')
    })
  )
  .output(
    z.object({
      username: z.string().optional(),
      attributes: z.record(z.string(), z.string()).optional(),
      enabled: z.boolean().optional(),
      userStatus: z.string().optional(),
      creationDate: z.number().optional(),
      lastModifiedDate: z.number().optional(),
      success: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createCognitoClient(ctx);
    let { action, userPoolId, username } = ctx.input;

    if (action === 'create') {
      let params: Record<string, any> = {
        UserPoolId: userPoolId,
        Username: username
      };
      if (ctx.input.temporaryPassword) params.TemporaryPassword = ctx.input.temporaryPassword;
      if (ctx.input.attributes) params.UserAttributes = toAttributeList(ctx.input.attributes);
      if (ctx.input.suppressMessage) params.MessageAction = 'SUPPRESS';
      if (ctx.input.desiredDeliveryMediums)
        params.DesiredDeliveryMediums = ctx.input.desiredDeliveryMediums;

      let result = await client.adminCreateUser(params);
      let user = result.User;

      return {
        output: {
          username: user.Username,
          attributes: formatAttributes(user.Attributes || []),
          enabled: user.Enabled,
          userStatus: user.UserStatus,
          creationDate: user.UserCreateDate,
          lastModifiedDate: user.UserLastModifiedDate
        },
        message: `Created user **${user.Username}** with status ${user.UserStatus}.`
      };
    }

    if (action === 'get') {
      let result = await client.adminGetUser(userPoolId, username);

      return {
        output: {
          username: result.Username,
          attributes: formatAttributes(result.UserAttributes || []),
          enabled: result.Enabled,
          userStatus: result.UserStatus,
          creationDate: result.UserCreateDate,
          lastModifiedDate: result.UserLastModifiedDate
        },
        message: `User **${result.Username}** is ${result.Enabled ? 'enabled' : 'disabled'} (${result.UserStatus}).`
      };
    }

    if (action === 'update_attributes') {
      if (!ctx.input.attributes) {
        throw cognitoServiceError('attributes are required for update_attributes action');
      }

      await client.adminUpdateUserAttributes(
        userPoolId,
        username,
        toAttributeList(ctx.input.attributes)
      );

      return {
        output: { username, success: true },
        message: `Updated attributes for user **${username}**.`
      };
    }

    if (action === 'delete') {
      await client.adminDeleteUser(userPoolId, username);
      return {
        output: { username, success: true },
        message: `Deleted user **${username}**.`
      };
    }

    if (action === 'disable') {
      await client.adminDisableUser(userPoolId, username);
      return {
        output: { username, enabled: false, success: true },
        message: `Disabled user **${username}**.`
      };
    }

    if (action === 'enable') {
      await client.adminEnableUser(userPoolId, username);
      return {
        output: { username, enabled: true, success: true },
        message: `Enabled user **${username}**.`
      };
    }

    if (action === 'confirm') {
      await client.adminConfirmSignUp(userPoolId, username);
      return {
        output: { username, userStatus: 'CONFIRMED', success: true },
        message: `Confirmed sign-up for user **${username}**.`
      };
    }

    if (action === 'reset_password') {
      await client.adminResetUserPassword(userPoolId, username);
      return {
        output: { username, userStatus: 'RESET_REQUIRED', success: true },
        message: `Reset password for user **${username}**. A reset code has been sent.`
      };
    }

    if (action === 'set_password') {
      if (!ctx.input.password) {
        throw cognitoServiceError('password is required for set_password action');
      }
      await client.adminSetUserPassword(
        userPoolId,
        username,
        ctx.input.password,
        ctx.input.permanent ?? true
      );
      return {
        output: { username, success: true },
        message: `Set password for user **${username}**${ctx.input.permanent !== false ? ' (permanent)' : ' (temporary)'}.`
      };
    }

    throw cognitoServiceError(`Unknown action: ${action}`);
  })
  .build();
