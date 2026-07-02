import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let incidentMembershipEvents = SlateTrigger.create(spec, {
  name: 'Incident Membership Events',
  key: 'incident_membership_events',
  description: 'Triggered when a user is granted or revoked access to a private incident.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type'),
      webhookId: z.string().describe('Unique ID for this webhook delivery'),
      incidentId: z.string().describe('ID of the private incident'),
      userId: z.string().optional().describe('ID of the user whose membership changed'),
      membership: z.any().optional().describe('Full membership payload')
    })
  )
  .output(
    z.object({
      incidentId: z.string(),
      userId: z.string().optional(),
      action: z.enum(['granted', 'revoked']).optional()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = (body.event_type as string) || '';

      let isMembershipEvent =
        eventType.includes('membership_granted') || eventType.includes('membership_revoked');

      if (!isMembershipEvent) {
        return { inputs: [] };
      }

      let membershipData = body.membership || body.incident_membership;
      let incidentId = membershipData?.incident_id || '';
      let userId = membershipData?.user_id || membershipData?.user?.id || '';

      return {
        inputs: [
          {
            eventType,
            webhookId: body.id || crypto.randomUUID(),
            incidentId,
            userId: userId || undefined,
            membership: membershipData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      let action: 'granted' | 'revoked' | undefined;
      if (input.eventType.includes('membership_granted')) {
        action = 'granted';
      } else if (input.eventType.includes('membership_revoked')) {
        action = 'revoked';
      }

      return {
        type: `incident_membership.${action || 'updated'}`,
        id: input.webhookId,
        output: {
          incidentId: input.incidentId,
          userId: input.userId,
          action
        }
      };
    }
  })
  .build();
