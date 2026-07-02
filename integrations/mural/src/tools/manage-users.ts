import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userOutputSchema = z.object({
  userId: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  avatarUrl: z.string().optional(),
  role: z.string().optional(),
  type: z.string().optional()
});

export let getCurrentUserTool = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Retrieve profile information for the currently authenticated user.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let u = await client.getCurrentUser();

    return {
      output: {
        userId: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        avatarUrl: u.avatar,
        role: u.role,
        type: u.type
      },
      message: `Authenticated as **${u.firstName} ${u.lastName}** (${u.email}).`
    };
  })
  .build();

export let listMuralUsersTool = SlateTool.create(spec, {
  name: 'List Mural Members',
  key: 'list_mural_members',
  description: `List all members and guests who have access to a specific mural.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural to list members from')
    })
  )
  .output(
    z.object({
      users: z.array(userOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listMuralUsers(ctx.input.muralId);

    let users = result.value.map(u => ({
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      avatarUrl: u.avatar,
      role: u.role,
      type: u.type
    }));

    return {
      output: { users },
      message: `Found **${users.length}** member(s) on the mural.`
    };
  })
  .build();

export let inviteUsersTool = SlateTool.create(spec, {
  name: 'Invite Users',
  key: 'invite_users',
  description: `Invite users by email to a mural, room, or workspace. Specify exactly one of **muralId**, **roomId**, or **workspaceId** to determine the target.`,
  instructions: [
    'Provide one of muralId, roomId, or workspaceId to specify where to invite users.',
    'Multiple email addresses can be provided to invite several users at once.'
  ]
})
  .input(
    z.object({
      muralId: z.string().optional().describe('ID of the mural to invite users to'),
      roomId: z.string().optional().describe('ID of the room to invite users to'),
      workspaceId: z.string().optional().describe('ID of the workspace to invite users to'),
      emails: z.array(z.string()).describe('Email addresses of users to invite'),
      role: z.string().optional().describe('Role to assign (e.g., "editor", "viewer")'),
      message: z.string().optional().describe('Custom invitation message')
    })
  )
  .output(
    z.object({
      invited: z.boolean(),
      target: z.string().describe('The resource type the users were invited to'),
      targetId: z.string().describe('The ID of the resource')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { muralId, roomId, workspaceId, emails, role, message } = ctx.input;
    let body = { emails, role, message };

    let target: string;
    let targetId: string;

    if (muralId) {
      await client.inviteToMural(muralId, body);
      target = 'mural';
      targetId = muralId;
    } else if (roomId) {
      await client.inviteToRoom(roomId, body);
      target = 'room';
      targetId = roomId;
    } else if (workspaceId) {
      await client.inviteToWorkspace(workspaceId, body);
      target = 'workspace';
      targetId = workspaceId;
    } else {
      throw new Error('One of muralId, roomId, or workspaceId must be provided');
    }

    return {
      output: { invited: true, target, targetId },
      message: `Invited **${emails.length}** user(s) to ${target} **${targetId}**.`
    };
  })
  .build();

export let removeUsersTool = SlateTool.create(spec, {
  name: 'Remove Users',
  key: 'remove_users',
  description: `Remove users from a mural or room by email. Specify either **muralId** or **roomId** to determine the target.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      muralId: z.string().optional().describe('ID of the mural to remove users from'),
      roomId: z.string().optional().describe('ID of the room to remove users from'),
      emails: z.array(z.string()).describe('Email addresses of users to remove')
    })
  )
  .output(
    z.object({
      removed: z.boolean(),
      target: z.string(),
      targetId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { muralId, roomId, emails } = ctx.input;

    let target: string;
    let targetId: string;

    if (muralId) {
      await client.removeFromMural(muralId, { emails });
      target = 'mural';
      targetId = muralId;
    } else if (roomId) {
      await client.removeFromRoom(roomId, { emails });
      target = 'room';
      targetId = roomId;
    } else {
      throw new Error('Either muralId or roomId must be provided');
    }

    return {
      output: { removed: true, target, targetId },
      message: `Removed **${emails.length}** user(s) from ${target} **${targetId}**.`
    };
  })
  .build();
