import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let assignTicket = SlateTool.create(spec, {
  name: 'Assign Ticket',
  key: 'assign_ticket',
  description: `Assign or unassign a ticket to/from a user or team. Supports assigning to a specific agent by user ID, assigning to a team by team ID, or removing existing user/team assignments.`,
  instructions: [
    'To assign to a user, provide userId. To assign to a team, provide teamId.',
    'To unassign, set unassignUser or unassignTeam to true.',
    'User and team assignments are independent — a ticket can be assigned to both a user and a team simultaneously.'
  ]
})
  .input(
    z.object({
      ticketId: z.number().describe('The ID of the ticket to assign'),
      userId: z.number().optional().describe('Assign ticket to this user ID'),
      teamId: z.number().optional().describe('Assign ticket to this team ID'),
      unassignUser: z.boolean().optional().describe('Remove user assignment from the ticket'),
      unassignTeam: z.boolean().optional().describe('Remove team assignment from the ticket')
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('The ID of the ticket'),
      actions: z.array(z.string()).describe('List of assignment actions performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companySubdomain: ctx.config.companySubdomain
    });

    let actions: string[] = [];

    if (ctx.input.unassignUser) {
      await client.unassignUser(ctx.input.ticketId);
      actions.push('Unassigned user');
    }

    if (ctx.input.unassignTeam) {
      await client.unassignTeam(ctx.input.ticketId);
      actions.push('Unassigned team');
    }

    if (ctx.input.userId) {
      await client.assignToUser(ctx.input.ticketId, ctx.input.userId);
      actions.push(`Assigned to user ${ctx.input.userId}`);
    }

    if (ctx.input.teamId) {
      await client.assignToTeam(ctx.input.ticketId, ctx.input.teamId);
      actions.push(`Assigned to team ${ctx.input.teamId}`);
    }

    return {
      output: { ticketId: ctx.input.ticketId, actions },
      message: `Ticket **#${ctx.input.ticketId}**: ${actions.join(', ')}`
    };
  })
  .build();
