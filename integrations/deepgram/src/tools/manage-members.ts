import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepgramClient } from '../lib/client';
import { spec } from '../spec';

let memberSchema = z.object({
  memberId: z.string().describe('Unique member identifier.'),
  email: z.string().optional().describe('Member email address.'),
  firstName: z.string().optional().describe('Member first name.'),
  lastName: z.string().optional().describe('Member last name.'),
  scopes: z.array(z.string()).optional().describe('Member permission scopes.')
});

let invitationSchema = z.object({
  email: z.string().optional().describe('Invitee email address.'),
  scope: z.string().optional().describe('Role or scope attached to the invitation.'),
  created: z.string().optional().describe('Invitation creation timestamp.'),
  metadata: z.any().optional().describe('Additional Deepgram invitation metadata.')
});

let toMember = (m: any): z.infer<typeof memberSchema> => ({
  memberId: m.member_id || m.memberId || m.id || '',
  email: m.email,
  firstName: m.first_name || m.firstName,
  lastName: m.last_name || m.lastName,
  scopes: m.scopes
});

let toInvitation = (invite: any): z.infer<typeof invitationSchema> => ({
  email: invite.email,
  scope: invite.scope,
  created: invite.created,
  metadata: invite
});

export let listMembersTool = SlateTool.create(spec, {
  name: 'List Project Members',
  key: 'list_members',
  description: `List all members of a Deepgram project. Returns member details including name, email, and permission scopes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.')
    })
  )
  .output(
    z.object({
      members: z.array(memberSchema).describe('List of project members.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.listMembers(ctx.input.projectId);
    let members = (result.members || []).map(toMember);

    return {
      output: { members },
      message: `Found **${members.length}** member(s) in the project.`
    };
  })
  .build();

export let getMemberScopesTool = SlateTool.create(spec, {
  name: 'Get Member Scopes',
  key: 'get_member_scopes',
  description: `Get the role/scopes for a specific Deepgram project member.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      memberId: z.string().describe('ID of the member.')
    })
  )
  .output(
    z.object({
      memberId: z.string().describe('Member ID.'),
      scopes: z.array(z.string()).describe('Member permission scopes.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.getMemberScopes(ctx.input.projectId, ctx.input.memberId);
    let scopes = Array.isArray(result.scopes)
      ? result.scopes
      : typeof result.scope === 'string'
        ? [result.scope]
        : [];

    return {
      output: {
        memberId: ctx.input.memberId,
        scopes
      },
      message: `Retrieved **${scopes.length}** scope(s) for member **${ctx.input.memberId}**.`
    };
  })
  .build();

export let removeMemberTool = SlateTool.create(spec, {
  name: 'Remove Project Member',
  key: 'remove_member',
  description: `Remove a member from a Deepgram project. Requires Admin or Owner permissions.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      memberId: z.string().describe('ID of the member to remove.')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    await client.removeMember(ctx.input.projectId, ctx.input.memberId);

    return {
      output: { message: 'Member removed successfully.' },
      message: `Removed member **${ctx.input.memberId}** from project.`
    };
  })
  .build();

export let updateMemberScopesTool = SlateTool.create(spec, {
  name: 'Update Member Scopes',
  key: 'update_member_scopes',
  description: `Update a project member's role/scopes. Valid scopes are "member", "admin", or "owner".`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      memberId: z.string().describe('ID of the member to update.'),
      scope: z.enum(['member', 'admin', 'owner']).describe('New scope/role for the member.')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    await client.updateMemberScopes(ctx.input.projectId, ctx.input.memberId, ctx.input.scope);

    return {
      output: { message: `Member scope updated to "${ctx.input.scope}".` },
      message: `Updated member **${ctx.input.memberId}** scope to **${ctx.input.scope}**.`
    };
  })
  .build();

export let listInvitationsTool = SlateTool.create(spec, {
  name: 'List Project Invitations',
  key: 'list_invitations',
  description: `List pending invitations for a Deepgram project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.')
    })
  )
  .output(
    z.object({
      invitations: z.array(invitationSchema).describe('Pending project invitations.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.listInvitations(ctx.input.projectId);
    let invitations = (result.invites || result.invitations || []).map(toInvitation);

    return {
      output: { invitations },
      message: `Found **${invitations.length}** pending invitation(s).`
    };
  })
  .build();

export let sendInvitationTool = SlateTool.create(spec, {
  name: 'Send Project Invitation',
  key: 'send_invitation',
  description: `Invite a user to join a Deepgram project by email. Specify the role they should have upon accepting.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      email: z.string().describe('Email address of the user to invite.'),
      scope: z.enum(['member', 'admin', 'owner']).describe('Role for the invited user.')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    await client.sendInvitation(ctx.input.projectId, ctx.input.email, ctx.input.scope);

    return {
      output: { message: `Invitation sent to ${ctx.input.email}.` },
      message: `Sent invitation to **${ctx.input.email}** with **${ctx.input.scope}** role.`
    };
  })
  .build();

export let deleteInvitationTool = SlateTool.create(spec, {
  name: 'Delete Project Invitation',
  key: 'delete_invitation',
  description: `Delete a pending Deepgram project invitation by invitee email address.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      email: z.string().describe('Email address on the invitation to delete.')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    await client.deleteInvitation(ctx.input.projectId, ctx.input.email);

    return {
      output: { message: `Invitation deleted for ${ctx.input.email}.` },
      message: `Deleted invitation for **${ctx.input.email}**.`
    };
  })
  .build();
