import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let experienceEvent = SlateTrigger.create(spec, {
  name: 'Experience Event',
  key: 'experience_event',
  description:
    'Triggered when a user interacts with an Appcues experience — including web flows, checklists, banners, pins, mobile flows, and NPS surveys. Configure in Appcues Studio under Settings > Integrations > Webhooks.'
})
  .input(
    z.object({
      eventName: z.string().describe('The Appcues event name'),
      eventId: z.string().describe('Unique identifier for this event'),
      userId: z.string().describe('The user who triggered the event'),
      accountId: z.string().optional().describe('The Appcues account ID'),
      groupId: z.string().optional().describe('The group ID associated with the user'),
      timestamp: z.string().describe('When the event occurred'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Event-specific attributes'),
      context: z
        .record(z.string(), z.any())
        .optional()
        .describe('Context data such as URL information')
    })
  )
  .output(
    z.object({
      eventName: z.string().describe('The Appcues event name'),
      userId: z.string().describe('The user who triggered the event'),
      groupId: z.string().optional().describe('Group ID associated with the user'),
      timestamp: z.string().describe('When the event occurred'),
      flowId: z.string().optional().describe('Flow/experience ID if applicable'),
      flowName: z.string().optional().describe('Flow/experience name if applicable'),
      flowType: z.string().optional().describe('Type of the flow/experience'),
      score: z.number().optional().describe('NPS score if applicable'),
      feedback: z.string().optional().describe('NPS feedback text if applicable'),
      checklistId: z.string().optional().describe('Checklist ID if applicable'),
      stepId: z.string().optional().describe('Step ID if applicable'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('All event-specific attributes'),
      pageUrl: z.string().optional().describe('Page URL where the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data?.name) {
        return { inputs: [] };
      }

      let eventName = String(data.name || '').toLowerCase();

      // Filter out workflow events (those are handled by the workflow trigger)
      let isWorkflowEvent =
        eventName.startsWith('appcues:email') ||
        eventName.startsWith('appcues:push') ||
        eventName.startsWith('appcues:workflow') ||
        eventName.startsWith('email_') ||
        eventName.startsWith('push_') ||
        eventName.startsWith('workflow_') ||
        eventName.includes('device_unregistered');

      if (isWorkflowEvent) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventName: String(data.name || ''),
            eventId: String(
              data.id ||
                `${data.user_id || ''}_${data.name || ''}_${data.timestamp || Date.now()}`
            ),
            userId: String(data.user_id || ''),
            accountId: data.account_id ? String(data.account_id) : undefined,
            groupId: data.group_id ? String(data.group_id) : undefined,
            timestamp: String(data.timestamp || new Date().toISOString()),
            attributes: data.attributes || undefined,
            context: data.context || undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let attrs: Record<string, any> = ctx.input.attributes || {};

      let eventType = ctx.input.eventName
        .toLowerCase()
        .replace('appcues:', '')
        .replace(/ /g, '_');

      let flowId = String(attrs.flowId || attrs.flow_id || '');
      let flowName = String(attrs.flowName || attrs.flow_name || '');
      let flowType = String(attrs.flowType || attrs.flow_type || '');
      let feedback = String(attrs.feedback || '');
      let checklistId = String(attrs.checklistId || attrs.checklist_id || '');
      let stepId = String(attrs.stepId || attrs.step_id || '');
      let pageUrl = String(ctx.input.context?.url || attrs.currentPageUrl || '');

      return {
        type: `experience.${eventType}`,
        id: ctx.input.eventId,
        output: {
          eventName: ctx.input.eventName,
          userId: ctx.input.userId,
          groupId: ctx.input.groupId,
          timestamp: ctx.input.timestamp,
          flowId: flowId || undefined,
          flowName: flowName || undefined,
          flowType: flowType || undefined,
          score: attrs.score !== undefined ? Number(attrs.score) : undefined,
          feedback: feedback || undefined,
          checklistId: checklistId || undefined,
          stepId: stepId || undefined,
          attributes: attrs,
          pageUrl: pageUrl || undefined
        }
      };
    }
  })
  .build();
