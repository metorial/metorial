import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update an existing user's profile, account settings, admin status, or organizational unit. Can also suspend/unsuspend users and manage admin privileges.`,
  instructions: [
    'To change admin status, set the "isAdmin" field. This uses a separate API call to make/revoke admin privileges.',
    'Fields not provided will remain unchanged.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.updateUser)
  .input(
    z.object({
      userKey: z.string().describe('Email address or unique user ID of the user to update'),
      givenName: z.string().optional().describe('Updated first name'),
      familyName: z.string().optional().describe('Updated last name'),
      password: z.string().optional().describe('New password for the user'),
      orgUnitPath: z.string().optional().describe('Move user to a new org unit path'),
      suspended: z.boolean().optional().describe('Suspend or unsuspend the user account'),
      archived: z.boolean().optional().describe('Archive or unarchive the user'),
      changePasswordAtNextLogin: z
        .boolean()
        .optional()
        .describe('Require password change at next login'),
      isAdmin: z.boolean().optional().describe('Grant or revoke super admin privileges'),
      recoveryEmail: z.string().optional().describe('Updated recovery email'),
      recoveryPhone: z.string().optional().describe('Updated recovery phone number'),
      phones: z
        .array(
          z.object({
            value: z.string(),
            type: z.string(),
            primary: z.boolean().optional()
          })
        )
        .optional()
        .describe('Updated phone numbers'),
      organizations: z
        .array(
          z.object({
            name: z.string().optional(),
            title: z.string().optional(),
            department: z.string().optional(),
            primary: z.boolean().optional()
          })
        )
        .optional()
        .describe('Updated organization details')
    })
  )
  .output(
    z.object({
      userId: z.string().optional(),
      primaryEmail: z.string().optional(),
      name: z
        .object({
          givenName: z.string().optional(),
          familyName: z.string().optional(),
          fullName: z.string().optional()
        })
        .optional(),
      orgUnitPath: z.string().optional(),
      suspended: z.boolean().optional(),
      isAdmin: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId,
      domain: ctx.config.domain
    });

    let updateData: Record<string, any> = {};

    if (ctx.input.givenName || ctx.input.familyName) {
      updateData.name = {};
      if (ctx.input.givenName) updateData.name.givenName = ctx.input.givenName;
      if (ctx.input.familyName) updateData.name.familyName = ctx.input.familyName;
    }
    if (ctx.input.password !== undefined) updateData.password = ctx.input.password;
    if (ctx.input.orgUnitPath !== undefined) updateData.orgUnitPath = ctx.input.orgUnitPath;
    if (ctx.input.suspended !== undefined) updateData.suspended = ctx.input.suspended;
    if (ctx.input.archived !== undefined) updateData.archived = ctx.input.archived;
    if (ctx.input.changePasswordAtNextLogin !== undefined)
      updateData.changePasswordAtNextLogin = ctx.input.changePasswordAtNextLogin;
    if (ctx.input.recoveryEmail !== undefined)
      updateData.recoveryEmail = ctx.input.recoveryEmail;
    if (ctx.input.recoveryPhone !== undefined)
      updateData.recoveryPhone = ctx.input.recoveryPhone;
    if (ctx.input.phones !== undefined) updateData.phones = ctx.input.phones;
    if (ctx.input.organizations !== undefined)
      updateData.organizations = ctx.input.organizations;

    let user: any = {};

    if (Object.keys(updateData).length > 0) {
      await client.updateUser(ctx.input.userKey, updateData);
      user = await client.getUser(ctx.input.userKey);
    } else {
      user = await client.getUser(ctx.input.userKey);
    }

    if (ctx.input.isAdmin !== undefined) {
      await client.makeUserAdmin(ctx.input.userKey, ctx.input.isAdmin);
      user.isAdmin = ctx.input.isAdmin;
    }

    return {
      output: {
        userId: user.id,
        primaryEmail: user.primaryEmail,
        name: user.name
          ? {
              givenName: user.name.givenName,
              familyName: user.name.familyName,
              fullName: user.name.fullName
            }
          : undefined,
        orgUnitPath: user.orgUnitPath,
        suspended: user.suspended,
        isAdmin: user.isAdmin
      },
      message: `Updated user **${user.primaryEmail}**.`
    };
  })
  .build();
