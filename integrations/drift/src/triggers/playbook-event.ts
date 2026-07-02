import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let playbookEvent = SlateTrigger.create(spec, {
  name: 'Playbook Goal Met',
  key: 'playbook_goal_met',
  description:
    'Triggers when a previously identified contact meets a goal within a Drift playbook.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      contactId: z.number().optional().describe('Contact ID who met the goal'),
      playbookName: z.string().optional().describe('Name of the playbook'),
      goalName: z.string().optional().describe('Name of the goal met'),
      createdAt: z.number().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      contactId: z.number().optional().describe('Contact ID who met the goal'),
      playbookName: z.string().optional().describe('Playbook name'),
      goalName: z.string().optional().describe('Goal name'),
      createdAt: z.number().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.type || 'unknown';
      let eventData = data.data || {};
      let timestamp = data.createdAt || Date.now();

      if (eventType !== 'playbook_goal_met') {
        return { inputs: [] };
      }

      let contactId = eventData.contactId;

      return {
        inputs: [
          {
            eventType,
            eventId: `${eventType}-${contactId}-${eventData.playbookName}-${timestamp}`,
            contactId,
            playbookName: eventData.playbookName,
            goalName: eventData.goalName,
            createdAt: timestamp
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'playbook.goal_met',
        id: ctx.input.eventId,
        output: {
          contactId: ctx.input.contactId,
          playbookName: ctx.input.playbookName,
          goalName: ctx.input.goalName,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
