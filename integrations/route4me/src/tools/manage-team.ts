import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTeamMembers = SlateTool.create(spec, {
  name: 'Get Team Members',
  key: 'get_team_members',
  description: `Retrieve the list of team members (users) associated with your account. Returns member details including roles and contact info.`,
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
            memberId: z.number().describe('Member ID'),
            memberEmail: z.string().optional().describe('Member email'),
            memberFirstName: z.string().optional().describe('First name'),
            memberLastName: z.string().optional().describe('Last name'),
            memberPhone: z.string().optional().describe('Phone number'),
            memberType: z.string().optional().describe('Member type/role'),
            readOnly: z.boolean().optional().describe('Whether member has read-only access')
          })
        )
        .describe('List of team members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getUsers();
    let items = Array.isArray(result) ? result : result.results || [];

    return {
      output: {
        members: items.map((m: any) => ({
          memberId: m.member_id,
          memberEmail: m.member_email,
          memberFirstName: m.member_first_name,
          memberLastName: m.member_last_name,
          memberPhone: m.member_phone,
          memberType: m.member_type,
          readOnly: m.readonly_user
        }))
      },
      message: `Retrieved ${items.length} team member(s).`
    };
  })
  .build();

export let createTeamMember = SlateTool.create(spec, {
  name: 'Create Team Member',
  key: 'create_team_member',
  description: `Add a new team member to your account. Specify their role, contact info, and permissions.
Supported member types: "PRIMARY_ACCOUNT" (owner), "SUB_ACCOUNT_ADMIN", "SUB_ACCOUNT_REGIONAL_MANAGER", "SUB_ACCOUNT_DISPATCHER", "SUB_ACCOUNT_PLANNER", "SUB_ACCOUNT_DRIVER", "SUB_ACCOUNT_ANALYST".`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      memberEmail: z.string().describe('Email address for the new member'),
      memberFirstName: z.string().describe('First name'),
      memberLastName: z.string().describe('Last name'),
      memberPhone: z.string().optional().describe('Phone number'),
      memberType: z.string().describe('Member type/role'),
      memberPassword: z.string().describe('Initial password for the member'),
      readOnly: z.boolean().optional().describe('Whether member has read-only access')
    })
  )
  .output(
    z.object({
      memberId: z.number().describe('Created member ID'),
      memberEmail: z.string().optional().describe('Member email')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let body = {
      HIDE_ROUTED_ADDRESSES: false,
      member_phone: ctx.input.memberPhone || '',
      member_email: ctx.input.memberEmail,
      member_first_name: ctx.input.memberFirstName,
      member_last_name: ctx.input.memberLastName,
      member_type: ctx.input.memberType,
      member_password: ctx.input.memberPassword,
      readonly_user: ctx.input.readOnly || false
    };

    let result = await client.createMember(body);

    return {
      output: {
        memberId: result.member_id,
        memberEmail: result.member_email
      },
      message: `Created team member **${result.member_id}** (${ctx.input.memberEmail}).`
    };
  })
  .build();

export let updateTeamMember = SlateTool.create(spec, {
  name: 'Update Team Member',
  key: 'update_team_member',
  description: `Update an existing team member's profile, role, or permissions.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      memberId: z.number().describe('Member ID to update'),
      memberEmail: z.string().optional().describe('New email'),
      memberFirstName: z.string().optional().describe('New first name'),
      memberLastName: z.string().optional().describe('New last name'),
      memberPhone: z.string().optional().describe('New phone number'),
      memberType: z.string().optional().describe('New member type/role'),
      readOnly: z.boolean().optional().describe('Set read-only access')
    })
  )
  .output(
    z.object({
      memberId: z.number().describe('Updated member ID'),
      success: z.boolean().describe('Whether the update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let body: Record<string, any> = {
      member_id: ctx.input.memberId
    };
    if (ctx.input.memberEmail) body.member_email = ctx.input.memberEmail;
    if (ctx.input.memberFirstName) body.member_first_name = ctx.input.memberFirstName;
    if (ctx.input.memberLastName) body.member_last_name = ctx.input.memberLastName;
    if (ctx.input.memberPhone) body.member_phone = ctx.input.memberPhone;
    if (ctx.input.memberType) body.member_type = ctx.input.memberType;
    if (ctx.input.readOnly !== undefined) body.readonly_user = ctx.input.readOnly;

    await client.updateMember(body);

    return {
      output: { memberId: ctx.input.memberId, success: true },
      message: `Updated team member **${ctx.input.memberId}**.`
    };
  })
  .build();

export let deleteTeamMember = SlateTool.create(spec, {
  name: 'Delete Team Member',
  key: 'delete_team_member',
  description: `Remove a team member from your account. This action is permanent.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      memberId: z.number().describe('Member ID to delete')
    })
  )
  .output(
    z.object({
      memberId: z.number().describe('Deleted member ID'),
      deleted: z.boolean().describe('Whether deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteMember(ctx.input.memberId);
    return {
      output: { memberId: ctx.input.memberId, deleted: true },
      message: `Deleted team member **${ctx.input.memberId}**.`
    };
  })
  .build();
