import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
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
      members: z
        .array(
          z.object({
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

    if (ctx.input.memberId) {
      let result = await client.getWorkspaceMember(ctx.input.memberId);
      let member = result.data;
      return {
        output: {
          members: member
            ? [
                {
                  userId: member.userId,
                  fullName: member.fullName,
                  email: member.email,
                  phone: member.phone,
                  avatar: member.avatar,
                  userType: member.userType,
                  userStatus: member.userStatus,
                  timezone: member.timezone,
                  deactivated: member.deactivated
                }
              ]
            : []
        },
        message: member
          ? `Retrieved member: **${member.fullName}** (${member.email}).`
          : 'Member not found.'
      };
    }

    let result = await client.getWorkspaceMembers();
    let members = (Array.isArray(result.data) ? result.data : []).map((m: any) => ({
      userId: m.userId,
      fullName: m.fullName,
      email: m.email,
      phone: m.phone,
      avatar: m.avatar,
      userType: m.userType,
      userStatus: m.userStatus,
      timezone: m.timezone,
      deactivated: m.deactivated
    }));

    return {
      output: { members },
      message: `Found ${members.length} workspace member(s).`
    };
  })
  .build();
