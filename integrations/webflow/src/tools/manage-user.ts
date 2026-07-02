import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Invite, update, or remove a user account on a membership-enabled Webflow site. Manage access group assignments to control gated content access.`,
  instructions: [
    'To **invite** a new user, set action to "invite" and provide email and optional accessGroups.',
    'To **update** a user, set action to "update" and provide userId with new accessGroups.',
    'To **delete** a user, set action to "delete" and provide userId.',
    'To **get** a user, set action to "get" and provide userId.'
  ]
})
  .input(
    z.object({
      siteId: z.string().describe('Unique identifier of the Webflow site'),
      action: z.enum(['invite', 'update', 'delete', 'get']).describe('Action to perform'),
      userId: z.string().optional().describe('User ID (required for update, delete, get)'),
      email: z.string().optional().describe('Email address (required for invite)'),
      accessGroups: z
        .array(z.string())
        .optional()
        .describe('Access group IDs to assign to the user')
    })
  )
  .output(
    z.object({
      userId: z.string().optional().describe('User account ID'),
      email: z.string().optional().describe('User email address'),
      status: z.string().optional().describe('Account status (e.g., invited, verified)'),
      createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
      lastUpdated: z.string().optional().describe('ISO 8601 last update timestamp'),
      accessGroups: z.array(z.any()).optional().describe('Assigned access groups'),
      deleted: z.boolean().optional().describe('Whether the user was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let { siteId, action, userId, email, accessGroups } = ctx.input;

    if (action === 'delete') {
      if (!userId) throw new Error('userId is required for delete action');
      await client.deleteUser(siteId, userId);
      return {
        output: { userId, deleted: true },
        message: `Deleted user **${userId}** from site **${siteId}**.`
      };
    }

    if (action === 'get') {
      if (!userId) throw new Error('userId is required for get action');
      let user = await client.getUser(siteId, userId);
      return {
        output: {
          userId: user.id ?? userId,
          email: user.email,
          status: user.status,
          createdOn: user.createdOn,
          lastUpdated: user.lastUpdated,
          accessGroups: user.accessGroups
        },
        message: `Retrieved user **${user.email ?? userId}**.`
      };
    }

    if (action === 'update') {
      if (!userId) throw new Error('userId is required for update action');
      let user = await client.updateUser(siteId, userId, { accessGroups });
      return {
        output: {
          userId: user.id ?? userId,
          email: user.email,
          status: user.status,
          createdOn: user.createdOn,
          lastUpdated: user.lastUpdated,
          accessGroups: user.accessGroups
        },
        message: `Updated user **${user.email ?? userId}**.`
      };
    }

    // invite
    if (!email) throw new Error('email is required for invite action');
    let user = await client.inviteUser(siteId, { email, accessGroups });
    return {
      output: {
        userId: user.id ?? user._id,
        email: user.email ?? email,
        status: user.status ?? 'invited',
        createdOn: user.createdOn,
        lastUpdated: user.lastUpdated,
        accessGroups: user.accessGroups
      },
      message: `Invited user **${email}** to site **${siteId}**.`
    };
  })
  .build();
