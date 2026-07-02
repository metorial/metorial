import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let workflowEvent = SlateTrigger.create(spec, {
  name: 'Workflow Event',
  key: 'workflow_event',
  description:
    'Triggered by Appcues workflow events including email delivery, push notifications, and workflow lifecycle events. Configure in Appcues Studio under Settings > Integrations > Webhooks.'
})
  .input(
    z.object({
      eventName: z.string().describe('The Appcues event name'),
      eventId: z.string().describe('Unique identifier for this event'),
      userId: z.string().describe('The user associated with the event'),
      accountId: z.string().optional().describe('The Appcues account ID'),
      groupId: z.string().optional().describe('The group ID associated with the user'),
      timestamp: z.string().describe('When the event occurred'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Event-specific attributes'),
      context: z.record(z.string(), z.any()).optional().describe('Context data')
    })
  )
  .output(
    z.object({
      eventName: z.string().describe('The Appcues event name'),
      userId: z.string().describe('The user associated with the event'),
      groupId: z.string().optional().describe('Group ID associated with the user'),
      timestamp: z.string().describe('When the event occurred'),
      workflowId: z.string().optional().describe('Workflow ID if applicable'),
      workflowName: z.string().optional().describe('Workflow name if applicable'),
      emailSubject: z.string().optional().describe('Email subject if applicable'),
      channel: z.string().optional().describe('Communication channel (email, push)'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('All event-specific attributes')
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
      let isWorkflowEvent =
        eventName.startsWith('appcues:email') ||
        eventName.startsWith('appcues:push') ||
        eventName.startsWith('appcues:workflow') ||
        eventName.startsWith('email_') ||
        eventName.startsWith('push_') ||
        eventName.startsWith('workflow_') ||
        eventName.includes('device_unregistered');

      if (!isWorkflowEvent) {
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
      let eventName = ctx.input.eventName.toLowerCase();

      let channel: string | undefined;
      if (eventName.includes('email')) channel = 'email';
      else if (eventName.includes('push')) channel = 'push';
      else channel = 'workflow';

      let eventType = ctx.input.eventName
        .toLowerCase()
        .replace('appcues:', '')
        .replace(/ /g, '_');

      let workflowId = String(attrs.workflowId || attrs.workflow_id || '');
      let workflowName = String(attrs.workflowName || attrs.workflow_name || '');
      let emailSubject = String(
        attrs.emailSubject || attrs.email_subject || attrs.subject || ''
      );

      return {
        type: `workflow.${eventType}`,
        id: ctx.input.eventId,
        output: {
          eventName: ctx.input.eventName,
          userId: ctx.input.userId,
          groupId: ctx.input.groupId,
          timestamp: ctx.input.timestamp,
          workflowId: workflowId || undefined,
          workflowName: workflowName || undefined,
          emailSubject: emailSubject || undefined,
          channel,
          attributes: attrs
        }
      };
    }
  })
  .build();
