import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createGroup = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description: `Create a new Splitwise group for sharing expenses. You can specify the group type and optionally add initial members by user ID or email.`,
  instructions: [
    'Members can be added by user ID or by email address (for users not yet on Splitwise).'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Name of the group'),
      groupType: z
        .enum(['home', 'trip', 'couple', 'other', 'apartment', 'house'])
        .optional()
        .describe('Type of group'),
      simplifyByDefault: z.boolean().optional().describe('Enable simplified debts by default'),
      members: z
        .array(
          z.object({
            userId: z.number().optional().describe('Splitwise user ID to add'),
            email: z
              .string()
              .optional()
              .describe('Email of person to add (for non-Splitwise users)'),
            firstName: z
              .string()
              .optional()
              .describe('First name (required when using email for new users)'),
            lastName: z.string().optional().describe('Last name (optional with email)')
          })
        )
        .optional()
        .describe('Initial group members to add')
    })
  )
  .output(
    z.object({
      groupId: z.number().describe('Created group ID'),
      name: z.string().describe('Group name'),
      groupType: z.string().optional().describe('Group type'),
      inviteLink: z.string().optional().describe('Invite link for the group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let group = await client.createGroup({
      name: ctx.input.name,
      group_type: ctx.input.groupType,
      simplify_by_default: ctx.input.simplifyByDefault,
      users: ctx.input.members?.map(m => ({
        user_id: m.userId,
        email: m.email,
        first_name: m.firstName,
        last_name: m.lastName
      }))
    });

    return {
      output: {
        groupId: group.id,
        name: group.name,
        groupType: group.group_type,
        inviteLink: group.invite_link
      },
      message: `Created group **${group.name}** (ID: ${group.id})`
    };
  })
  .build();
