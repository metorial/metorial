import { SlateTool } from 'slates';
import { z } from 'zod';
import { AttioClient } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaceMembersTool = SlateTool.create(spec, {
  name: 'List Workspace Members',
  key: 'list_workspace_members',
  description: `List all members of the Attio workspace, including their names, emails, roles, and avatar URLs. Useful for finding assignees for tasks or identifying team members.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      members: z
        .array(
          z.object({
            workspaceMemberId: z.string().describe('The workspace member ID'),
            firstName: z.string().describe('First name'),
            lastName: z.string().describe('Last name'),
            emailAddress: z.string().describe('Email address'),
            avatarUrl: z.string().optional().nullable().describe('Avatar URL'),
            accessLevel: z.string().describe('Access level (admin, member, suspended)'),
            createdAt: z.string().describe('When the member was added')
          })
        )
        .describe('Workspace members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });
    let members = await client.listWorkspaceMembers();

    let mapped = members.map((m: any) => ({
      workspaceMemberId: m.id?.workspace_member_id ?? '',
      firstName: m.first_name ?? '',
      lastName: m.last_name ?? '',
      emailAddress: m.email_address ?? '',
      avatarUrl: m.avatar_url ?? null,
      accessLevel: m.access_level ?? '',
      createdAt: m.created_at ?? ''
    }));

    return {
      output: { members: mapped },
      message: `Found **${mapped.length}** workspace member(s).`
    };
  })
  .build();
