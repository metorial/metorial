import { SlateTool } from 'slates';
import { z } from 'zod';
import { HootsuiteClient } from '../lib/client';
import { spec } from '../spec';

export let manageOrganizationMembersTool = SlateTool.create(spec, {
  name: 'Manage Organization Members',
  key: 'manage_organization_members',
  description: `List, retrieve, invite, or remove members in a Hootsuite organization.
Use **list** to see all members. Use **get** to fetch a specific member's details and permissions.
Use **invite** to add a new member by email. Use **remove** to delete a member from the organization.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID'),
      action: z.enum(['list', 'get', 'invite', 'remove']).describe('Action to perform'),
      memberId: z.string().optional().describe('Member ID (required for get/remove)'),
      fullName: z
        .string()
        .optional()
        .describe('Full name of the new member (required for invite)'),
      email: z.string().optional().describe('Email of the new member (required for invite)'),
      companyName: z.string().optional().describe('Company name (for invite)'),
      bio: z.string().optional().describe('Bio (for invite)'),
      timezone: z.string().optional().describe('Timezone (for invite)'),
      cursor: z.string().optional().describe('Pagination cursor for list')
    })
  )
  .output(
    z.object({
      members: z
        .array(
          z.object({
            memberId: z.string().describe('Member ID'),
            fullName: z.string().optional().describe('Full name'),
            email: z.string().optional().describe('Email'),
            companyName: z.string().optional().describe('Company name'),
            bio: z.string().optional().describe('Bio'),
            timezone: z.string().optional().describe('Timezone'),
            permissions: z.any().optional().describe('Member permissions')
          })
        )
        .optional()
        .describe('List of members'),
      cursor: z.string().optional().describe('Pagination cursor'),
      success: z
        .boolean()
        .optional()
        .describe('Whether the action succeeded (for invite/remove)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HootsuiteClient(ctx.auth.token);
    let { organizationId, action } = ctx.input;

    if (action === 'list') {
      let result = await client.getOrganizationMembers(organizationId, ctx.input.cursor);
      let members = result.members.map((m: any) => ({
        memberId: String(m.id),
        fullName: m.fullName,
        email: m.email,
        companyName: m.companyName,
        bio: m.bio,
        timezone: m.timezone
      }));

      return {
        output: { members, cursor: result.cursor, success: undefined },
        message: `Found **${members.length}** member(s) in organization **${organizationId}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.memberId) throw new Error('memberId is required for get action');

      let member = await client.getOrganizationMember(organizationId, ctx.input.memberId);
      let permissions = await client
        .getOrganizationMemberPermissions(organizationId, ctx.input.memberId)
        .catch(() => null);

      return {
        output: {
          members: [
            {
              memberId: String(member.id),
              fullName: member.fullName,
              email: member.email,
              companyName: member.companyName,
              bio: member.bio,
              timezone: member.timezone,
              permissions
            }
          ],
          cursor: undefined,
          success: undefined
        },
        message: `Retrieved member **${member.fullName || member.id}**.`
      };
    }

    if (action === 'invite') {
      if (!ctx.input.fullName || !ctx.input.email) {
        throw new Error('fullName and email are required for invite action');
      }

      await client.inviteOrganizationMember({
        organizationId,
        fullName: ctx.input.fullName,
        email: ctx.input.email,
        companyName: ctx.input.companyName,
        bio: ctx.input.bio,
        timezone: ctx.input.timezone
      });

      return {
        output: { members: undefined, cursor: undefined, success: true },
        message: `Invited **${ctx.input.fullName}** (${ctx.input.email}) to organization **${organizationId}**.`
      };
    }

    // remove
    if (!ctx.input.memberId) throw new Error('memberId is required for remove action');

    await client.removeOrganizationMember(organizationId, ctx.input.memberId);
    return {
      output: { members: undefined, cursor: undefined, success: true },
      message: `Removed member **${ctx.input.memberId}** from organization **${organizationId}**.`
    };
  })
  .build();
