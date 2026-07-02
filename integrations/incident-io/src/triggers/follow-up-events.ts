import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let followUpEvents = SlateTrigger.create(spec, {
  name: 'Follow-Up Events',
  key: 'follow_up_events',
  description:
    'Triggered when follow-ups (actions) are created or updated on incidents. Covers both public and private incident follow-ups.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type'),
      webhookId: z.string().describe('Unique ID for this webhook delivery'),
      followUpId: z.string().describe('ID of the follow-up'),
      isPrivate: z.boolean().describe('Whether this follow-up belongs to a private incident'),
      followUp: z.any().optional().describe('Full follow-up payload')
    })
  )
  .output(
    z.object({
      followUpId: z.string(),
      title: z.string().optional(),
      status: z.string().optional(),
      priority: z.any().optional(),
      incidentId: z.string().optional(),
      assignee: z.any().optional(),
      completedAt: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = (body.event_type as string) || '';

      let isFollowUpEvent =
        eventType.includes('follow_up_created') ||
        eventType.includes('follow_up_updated') ||
        eventType.includes('action_created') ||
        eventType.includes('action_updated');

      if (!isFollowUpEvent) {
        return { inputs: [] };
      }

      let isPrivate = eventType.startsWith('private_incident.');

      // The follow-up/action data can be in different keys depending on the event type
      let followUpData = body.follow_up || body.action;
      let followUpId = followUpData?.id || '';

      return {
        inputs: [
          {
            eventType,
            webhookId: body.id || crypto.randomUUID(),
            followUpId,
            isPrivate,
            followUp: isPrivate ? undefined : followUpData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;
      let fu = input.followUp;

      if (input.isPrivate && !fu) {
        try {
          let client = new Client({ token: ctx.auth.token });
          let result = await client.getFollowUp(input.followUpId);
          fu = result.follow_up;
        } catch {
          // API key may not have private incident access
        }
      }

      let type = 'follow_up.updated';
      if (input.eventType.includes('created')) {
        type = 'follow_up.created';
      }

      return {
        type,
        id: input.webhookId,
        output: {
          followUpId: input.followUpId,
          title: fu?.title || undefined,
          status: fu?.status || undefined,
          priority: fu?.priority || undefined,
          incidentId: fu?.incident_id || undefined,
          assignee: fu?.assignee || undefined,
          completedAt: fu?.completed_at || undefined,
          createdAt: fu?.created_at || undefined,
          updatedAt: fu?.updated_at || undefined
        }
      };
    }
  })
  .build();
