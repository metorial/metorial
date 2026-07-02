import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTeam = SlateTool.create(spec, {
  name: 'Manage Team',
  key: 'manage_team',
  description: `Manage Scale AI Studio team members. List current teammates, invite new members, or update existing member roles.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'invite', 'update_role'])
        .describe('Action to perform: list teammates, invite new members, or update roles'),
      emails: z
        .array(z.string())
        .optional()
        .describe(
          'Email addresses of teammates to invite or update (required for invite and update_role)'
        ),
      teamRole: z
        .enum(['labeler', 'member', 'manager'])
        .optional()
        .describe('Role to assign (required for invite and update_role)')
    })
  )
  .output(
    z
      .object({
        teammates: z
          .array(
            z
              .object({
                email: z.string().optional().describe('Teammate email'),
                role: z.string().optional().describe('Teammate role'),
                firstName: z.string().optional().describe('First name'),
                lastName: z.string().optional().describe('Last name')
              })
              .passthrough()
          )
          .optional()
          .describe('List of teammates (when action is list)'),
        success: z.boolean().describe('Whether the operation succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listTeammates();
      let teammates = Array.isArray(result) ? result : (result.teammates ?? result.docs ?? []);

      let mapped = teammates.map((t: any) => ({
        email: t.email,
        role: t.role,
        firstName: t.firstName,
        lastName: t.lastName,
        ...t
      }));

      return {
        output: {
          teammates: mapped,
          success: true
        },
        message: `Found **${mapped.length}** teammate(s).`
      };
    }

    if (ctx.input.action === 'invite') {
      if (!ctx.input.emails || !ctx.input.teamRole) {
        throw new Error('emails and teamRole are required for invite action');
      }
      let result = await client.inviteTeammates(ctx.input.emails, ctx.input.teamRole);
      return {
        output: {
          success: true,
          ...result
        },
        message: `Invited **${ctx.input.emails.length}** teammate(s) as \`${ctx.input.teamRole}\`.`
      };
    }

    if (ctx.input.action === 'update_role') {
      if (!ctx.input.emails || !ctx.input.teamRole) {
        throw new Error('emails and teamRole are required for update_role action');
      }
      let result = await client.setTeammateRole(ctx.input.emails, ctx.input.teamRole);
      return {
        output: {
          success: true,
          ...result
        },
        message: `Updated **${ctx.input.emails.length}** teammate(s) to role \`${ctx.input.teamRole}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
