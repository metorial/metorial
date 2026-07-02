import { SlateTool } from 'slates';
import { z } from 'zod';
import { FilesComClient } from '../lib/client';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, update, or delete a user account. When creating, provide username and email. When updating, provide the user ID and any fields to change. Supports setting permissions, admin roles, authentication methods, and protocol access.`,
  instructions: [
    'For creating a user, username is required. Email may be required depending on site settings.',
    'When updating, only include the fields you want to change.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      userId: z.number().optional().describe('User ID (required for update and delete)'),
      username: z.string().optional().describe('Username (required for create)'),
      email: z.string().optional().describe('Email address'),
      name: z.string().optional().describe('Full name'),
      password: z.string().optional().describe('Password (for create or update)'),
      company: z.string().optional().describe('Company name'),
      notes: z.string().optional().describe('Internal notes about the user'),
      authenticationMethod: z
        .enum(['password', 'email_signup', 'sso', 'none', 'password_and_ssh_key'])
        .optional()
        .describe('Authentication method'),
      siteAdmin: z.boolean().optional().describe('Grant site admin access'),
      disabled: z.boolean().optional().describe('Disable the user account'),
      sftpPermission: z.boolean().optional().describe('Allow SFTP access'),
      ftpPermission: z.boolean().optional().describe('Allow FTP/FTPS access'),
      davPermission: z.boolean().optional().describe('Allow WebDAV access'),
      restapiPermission: z.boolean().optional().describe('Allow REST API access'),
      groupIds: z.string().optional().describe('Comma-separated group IDs to assign'),
      userRoot: z.string().optional().describe('Root folder for FTP/SFTP'),
      grantPermission: z
        .enum(['full', 'read', 'write', 'list', 'read+write', 'none'])
        .optional()
        .describe('Initial folder permissions (create only)'),
      requirePasswordChange: z
        .boolean()
        .optional()
        .describe('Require password change on next login'),
      require2fa: z
        .enum(['always_require', 'none'])
        .optional()
        .describe('Two-factor authentication requirement'),
      allowedIps: z
        .string()
        .optional()
        .describe('Newline-delimited list of allowed IP addresses'),
      authenticateUntil: z
        .string()
        .optional()
        .describe('Date after which user access expires (ISO 8601)')
    })
  )
  .output(
    z.object({
      userId: z.number().optional().describe('User ID'),
      username: z.string().optional().describe('Username'),
      email: z.string().optional().describe('Email address'),
      name: z.string().optional().describe('Full name'),
      siteAdmin: z.boolean().optional().describe('Site admin status'),
      deleted: z.boolean().optional().describe('Whether the user was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FilesComClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let { action, userId } = ctx.input;

    if (action === 'delete') {
      if (!userId) throw new Error('userId is required for delete');
      await client.deleteUser(userId);
      return {
        output: { userId, deleted: true },
        message: `Deleted user **${userId}**`
      };
    }

    let data: Record<string, unknown> = {};
    if (ctx.input.username !== undefined) data.username = ctx.input.username;
    if (ctx.input.email !== undefined) data.email = ctx.input.email;
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.password !== undefined) data.password = ctx.input.password;
    if (ctx.input.company !== undefined) data.company = ctx.input.company;
    if (ctx.input.notes !== undefined) data.notes = ctx.input.notes;
    if (ctx.input.authenticationMethod !== undefined)
      data.authentication_method = ctx.input.authenticationMethod;
    if (ctx.input.siteAdmin !== undefined) data.site_admin = ctx.input.siteAdmin;
    if (ctx.input.disabled !== undefined) data.disabled = ctx.input.disabled;
    if (ctx.input.sftpPermission !== undefined)
      data.sftp_permission = ctx.input.sftpPermission;
    if (ctx.input.ftpPermission !== undefined) data.ftp_permission = ctx.input.ftpPermission;
    if (ctx.input.davPermission !== undefined) data.dav_permission = ctx.input.davPermission;
    if (ctx.input.restapiPermission !== undefined)
      data.restapi_permission = ctx.input.restapiPermission;
    if (ctx.input.groupIds !== undefined) data.group_ids = ctx.input.groupIds;
    if (ctx.input.userRoot !== undefined) data.user_root = ctx.input.userRoot;
    if (ctx.input.grantPermission !== undefined)
      data.grant_permission = ctx.input.grantPermission;
    if (ctx.input.requirePasswordChange !== undefined)
      data.require_password_change = ctx.input.requirePasswordChange;
    if (ctx.input.require2fa !== undefined) data.require_2fa = ctx.input.require2fa;
    if (ctx.input.allowedIps !== undefined) data.allowed_ips = ctx.input.allowedIps;
    if (ctx.input.authenticateUntil !== undefined)
      data.authenticate_until = ctx.input.authenticateUntil;

    if (action === 'create') {
      if (!ctx.input.username) throw new Error('username is required for create');
      let result = await client.createUser(data);
      return {
        output: {
          userId: Number(result.id),
          username: String(result.username ?? ''),
          email: result.email ? String(result.email) : undefined,
          name: result.name ? String(result.name) : undefined,
          siteAdmin: typeof result.site_admin === 'boolean' ? result.site_admin : undefined
        },
        message: `Created user **${result.username}** (ID: ${result.id})`
      };
    }

    // update
    if (!userId) throw new Error('userId is required for update');
    let result = await client.updateUser(userId, data);
    return {
      output: {
        userId: Number(result.id),
        username: String(result.username ?? ''),
        email: result.email ? String(result.email) : undefined,
        name: result.name ? String(result.name) : undefined,
        siteAdmin: typeof result.site_admin === 'boolean' ? result.site_admin : undefined
      },
      message: `Updated user **${result.username}** (ID: ${result.id})`
    };
  })
  .build();
