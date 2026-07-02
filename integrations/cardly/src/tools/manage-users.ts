import { SlateTool } from 'slates';
import { z } from 'zod';
import { CardlyClient } from '../lib/client';
import { spec } from '../spec';

let permissionOptions = [
  'administrator',
  'artwork',
  'billing',
  'campaigns',
  'developer',
  'lists',
  'orders',
  'templates',
  'use-credits'
] as const;

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve all users who have access to your organisation portal, including their roles and permissions.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of results (default 25)'),
      offset: z.number().optional().describe('Number of records to skip')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().describe('Unique user ID'),
            firstName: z.string().describe('First name'),
            lastName: z.string().describe('Last name'),
            email: z.string().describe('Email address'),
            permissions: z.array(z.string()).optional().describe('User permissions')
          })
        )
        .describe('Organisation users'),
      totalRecords: z.number().describe('Total number of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let result = await client.listUsers({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let users = result.users.map(u => ({
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      permissions: u.permissions
    }));

    return {
      output: {
        users,
        totalRecords: result.meta.totalRecords
      },
      message: `Found **${users.length}** user(s) (${result.meta.totalRecords} total).`
    };
  })
  .build();

export let removeUser = SlateTool.create(spec, {
  name: 'Remove User',
  key: 'remove_user',
  description: `Remove a user's access to the organisation portal. This cannot be undone — the user will need to be re-invited.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('UUID of the user to remove')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the user was successfully removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });
    await client.removeUser(ctx.input.userId);

    return {
      output: { removed: true },
      message: `User **${ctx.input.userId}** removed from the organisation.`
    };
  })
  .build();

export let sendInvitation = SlateTool.create(spec, {
  name: 'Send Invitation',
  key: 'send_invitation',
  description: `Invite a new user to your organisation portal with specific permissions. Available permissions: administrator, artwork, billing, campaigns, developer, lists, orders, templates, use-credits.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to send the invitation to'),
      permissions: z
        .array(z.enum(permissionOptions))
        .min(1)
        .describe('Permissions to grant the invited user')
    })
  )
  .output(
    z.object({
      invitationId: z.string().describe('Unique invitation ID'),
      email: z.string().describe('Invited email address'),
      permissions: z.array(z.string()).describe('Granted permissions'),
      status: z.string().optional().describe('Invitation status'),
      createdAt: z.string().describe('When the invitation was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let invitation = await client.createInvitation({
      email: ctx.input.email,
      permissions: [...ctx.input.permissions]
    });

    return {
      output: {
        invitationId: invitation.id,
        email: invitation.email,
        permissions: invitation.permissions,
        status: invitation.status,
        createdAt: invitation.createdAt
      },
      message: `Invitation sent to **${invitation.email}** with ${invitation.permissions.length} permission(s).`
    };
  })
  .build();

export let manageInvitation = SlateTool.create(spec, {
  name: 'Manage Invitation',
  key: 'manage_invitation',
  description: `Resend or revoke a pending invitation by invitation ID or email address.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['resend', 'revoke']).describe('Action to perform on the invitation'),
      invitationId: z.string().optional().describe('UUID of the invitation'),
      email: z
        .string()
        .optional()
        .describe('Email address of the invitation (alternative to invitationId)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    if (ctx.input.action === 'resend') {
      if (ctx.input.invitationId) {
        await client.resendInvitation(ctx.input.invitationId);
      } else if (ctx.input.email) {
        await client.resendInvitationByEmail(ctx.input.email);
      }
    } else if (ctx.input.invitationId) {
      await client.deleteInvitation(ctx.input.invitationId);
    } else if (ctx.input.email) {
      await client.deleteInvitationByEmail(ctx.input.email);
    }

    let target = ctx.input.invitationId || ctx.input.email || 'unknown';

    return {
      output: { success: true },
      message: `Invitation for **${target}** ${ctx.input.action === 'resend' ? 'resent' : 'revoked'} successfully.`
    };
  })
  .build();
