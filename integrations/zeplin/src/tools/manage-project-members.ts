import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

let memberSchema = z.object({
  userId: z.string().describe('Member user ID'),
  email: z.string().optional().describe('Member email'),
  username: z.string().optional().describe('Member username'),
  role: z.string().optional().describe('Member role in the project'),
  avatar: z.string().optional().describe('Member avatar URL')
});

export let listProjectMembers = SlateTool.create(spec, {
  name: 'List Project Members',
  key: 'list_project_members',
  description: `List all members of a Zeplin project, including their roles and profile information. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100, default: 30)'),
      offset: z.number().min(0).optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      members: z.array(memberSchema).describe('List of project members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    let members = (await client.listProjectMembers(ctx.input.projectId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    })) as any[];

    let mapped = members.map((m: any) => ({
      userId: m.user?.id || m.id,
      email: m.user?.email || m.email,
      username: m.user?.username || m.username,
      role: m.role,
      avatar: m.user?.avatar || m.avatar
    }));

    return {
      output: { members: mapped },
      message: `Found **${mapped.length}** member(s) in the project.`
    };
  })
  .build();

export let inviteProjectMember = SlateTool.create(spec, {
  name: 'Invite Project Member',
  key: 'invite_project_member',
  description: `Invite a user to a Zeplin project by their email, username, or user ID. Optionally specify a role.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      handle: z
        .string()
        .describe('Email address, username, or user ID of the person to invite'),
      role: z.string().optional().describe('Role to assign (e.g. "editor", "viewer")')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the invitation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    await client.inviteProjectMember(ctx.input.projectId, {
      handle: ctx.input.handle,
      role: ctx.input.role
    });

    return {
      output: { success: true },
      message: `Invited **${ctx.input.handle}** to the project.`
    };
  })
  .build();

export let removeProjectMember = SlateTool.create(spec, {
  name: 'Remove Project Member',
  key: 'remove_project_member',
  description: `Remove a member from a Zeplin project by their user ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      memberId: z.string().describe('User ID of the member to remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the removal was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    await client.removeProjectMember(ctx.input.projectId, ctx.input.memberId);

    return {
      output: { success: true },
      message: `Removed member **${ctx.input.memberId}** from the project.`
    };
  })
  .build();
