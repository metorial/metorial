import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let assignmentOutputSchema = z.object({
  ticketId: z.number().describe('ID of the ticket whose assignment changed'),
  ticketSubject: z.string().optional().describe('Subject of the ticket'),
  assignedUserId: z
    .number()
    .optional()
    .nullable()
    .describe('ID of the newly assigned user, or null if unassigned'),
  assignedUserName: z
    .string()
    .optional()
    .nullable()
    .describe('Name of the newly assigned user'),
  assignedUserEmail: z
    .string()
    .optional()
    .nullable()
    .describe('Email of the newly assigned user'),
  assignedTeamId: z
    .number()
    .optional()
    .nullable()
    .describe('ID of the newly assigned team, or null if unassigned'),
  assignedTeamName: z
    .string()
    .optional()
    .nullable()
    .describe('Name of the newly assigned team')
});

export let assignmentEvents = SlateTrigger.create(spec, {
  name: 'Assignment Events',
  key: 'assignment_events',
  description:
    'Triggered when a ticket is assigned to or unassigned from a user or team. Configure the webhook URL in SupportBee admin settings under the Web Hooks tab.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of assignment event'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      rawData: z.any().describe('Raw webhook payload data')
    })
  )
  .output(assignmentOutputSchema)
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event_type || data.action || 'unknown';
      let ticket = data.ticket || data.object || {};
      let ticketId = ticket?.id || 'unknown';

      let eventId = `${eventType}-${ticketId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            rawData: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, rawData } = ctx.input;
      let ticket = rawData.ticket || rawData.object || {};
      let user = rawData.user || rawData.assignee || ticket.current_user_assignee;
      let team = rawData.team || rawData.group || ticket.current_team_assignee;

      let typeMap: Record<string, string> = {
        'ticket.assigned_to_user': 'ticket.assigned_to_user',
        user_assignment_create: 'ticket.assigned_to_user',
        'ticket.unassigned_from_user': 'ticket.unassigned_from_user',
        user_assignment_delete: 'ticket.unassigned_from_user',
        'ticket.assigned_to_team': 'ticket.assigned_to_team',
        team_assignment_create: 'ticket.assigned_to_team',
        'ticket.unassigned_from_team': 'ticket.unassigned_from_team',
        team_assignment_delete: 'ticket.unassigned_from_team'
      };

      let normalizedType = typeMap[eventType] || `ticket.${eventType}`;

      return {
        type: normalizedType,
        id: ctx.input.eventId,
        output: {
          ticketId: ticket.id || 0,
          ticketSubject: ticket.subject,
          assignedUserId: user?.id || null,
          assignedUserName: user?.name || null,
          assignedUserEmail: user?.email || null,
          assignedTeamId: team?.id || null,
          assignedTeamName: team?.name || null
        }
      };
    }
  })
  .build();
