import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { providerRecords, providerString } from '../lib/response';
import { spec } from '../spec';

export let listWorkspaceMembers = SlateTool.create(spec, {
  name: 'List Workspace Members',
  key: 'list_workspace_members',
  description: `Retrieve workspace members. Returns member details including name, email, role, timezone, and account status. Optionally get a specific member by ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      memberId: z
        .string()
        .optional()
        .describe('Specific member ID to retrieve. If omitted, returns all members.')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete response returned by Zixflow'),
      members: z
        .array(
          z.object({
            workspaceId: z.string().optional().describe('Workspace ID returned by Zixflow'),
            userId: z.string().describe('User ID'),
            fullName: z.string().describe('Full name'),
            email: z.string().describe('Email address'),
            phone: z.string().optional().describe('Phone number'),
            avatar: z.string().optional().describe('Avatar URL'),
            userType: z.string().optional().describe('User role type'),
            userStatus: z.string().optional().describe('Account status'),
            timezone: z.string().optional().describe('Timezone'),
            deactivated: z.boolean().optional().describe('Whether the account is deactivated')
          })
        )
        .describe('Workspace members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZixflowClient({ token: ctx.auth.token });

    let result = ctx.input.memberId
      ? await client.getWorkspaceMember(ctx.input.memberId)
      : await client.getWorkspaceMembers();
    let data = ctx.input.memberId
      ? result.data === null
        ? []
        : providerRecords([result.data])
      : providerRecords(result.data);
    let members = data.map(member => ({
      userId: providerString(member.userId, 'member user ID'),
      fullName: providerString(member.fullName, 'member full name'),
      email: providerString(member.email, 'member email'),
      workspaceId: typeof member.workspaceId === 'string' ? member.workspaceId : undefined,
      phone: typeof member.phone === 'string' ? member.phone : undefined,
      avatar: typeof member.avatar === 'string' ? member.avatar : undefined,
      userType: typeof member.userType === 'string' ? member.userType : undefined,
      userStatus: typeof member.userStatus === 'string' ? member.userStatus : undefined,
      timezone: typeof member.timezone === 'string' ? member.timezone : undefined,
      deactivated: typeof member.deactivated === 'boolean' ? member.deactivated : undefined
    }));
    return {
      output: { members, raw: result },
      message: `Retrieved ${members.length} workspace member(s).`
    };
  })
  .build();
