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

    let members = (result.members || []).map((m: any) => ({
      memberId: m.member_id,
      email: m.email,
      firstName: m.first_name,
      lastName: m.last_name,
      scopes: m.scopes
    }));

    return {
      output: { members },
      message: `Found **${members.length}** member(s) in the project.`
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
