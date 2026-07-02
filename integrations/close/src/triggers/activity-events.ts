import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let activityEventsTrigger = SlateTrigger.create(spec, {
  name: 'Activity Events',
  key: 'activity_events',
  description:
    'Triggers when an activity (email, call, note, SMS, meeting) is created, updated, or deleted in Close.'
})
  .input(
    z.object({
      eventAction: z.string().describe('The action that occurred (created, updated, deleted)'),
      eventId: z.string().describe('Unique event identifier'),
      objectId: z.string().describe('ID of the affected activity'),
      objectType: z
        .string()
        .describe('Full object type (e.g. activity.email, activity.call, activity.note)'),
      changedFields: z
        .array(z.string())
        .optional()
        .describe('Fields that changed during an update'),
      currentData: z.any().optional().describe('Current data after the change'),
      userId: z.string().optional().describe('User who triggered the event'),
      dateCreated: z.string().optional().describe('When the event was created')
    })
  )
  .output(
    z.object({
      activityId: z.string().describe('ID of the affected activity'),
      activityType: z.string().describe('Type of activity (email, call, note, sms, meeting)'),
      action: z.string().describe('The action that occurred'),
      changedFields: z.array(z.string()).optional().describe('Fields that changed'),
      leadId: z.string().optional().describe('ID of the parent lead'),
      contactId: z.string().optional().describe('ID of the related contact'),
      subject: z.string().optional().describe('Subject (for emails)'),
      bodyPreview: z.string().optional().describe('Preview of the body content'),
      direction: z
        .string()
        .optional()
        .describe('Direction (incoming/outgoing) for emails, calls, SMS'),
      status: z.string().optional().describe('Status of the activity'),
      userId: z.string().optional().describe('User who triggered the event'),
      dateCreated: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [
          { object_type: 'activity.email', action: 'created' },
          { object_type: 'activity.email', action: 'updated' },
          { object_type: 'activity.email', action: 'deleted' },
          { object_type: 'activity.call', action: 'created' },
          { object_type: 'activity.call', action: 'updated' },
          { object_type: 'activity.call', action: 'deleted' },
          { object_type: 'activity.note', action: 'created' },
          { object_type: 'activity.note', action: 'updated' },
          { object_type: 'activity.note', action: 'deleted' },
          { object_type: 'activity.sms', action: 'created' },
          { object_type: 'activity.sms', action: 'updated' },
          { object_type: 'activity.sms', action: 'deleted' },
          { object_type: 'activity.meeting', action: 'created' },
          { object_type: 'activity.meeting', action: 'updated' },
          { object_type: 'activity.meeting', action: 'deleted' }
        ],
        status: 'active'
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          signatureKey: webhook.signature_key
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (!data?.event) {
        return { inputs: [] };
      }

      let event = data.event;

      return {
        inputs: [
          {
            eventAction: event.action || data.action || 'unknown',
            eventId: event.id || data.id || `${event.object_id}_${event.date_created}`,
            objectId: event.object_id || '',
            objectType: event.object_type || 'activity',
            changedFields: event.changed_fields,
            currentData: event.data,
            userId: event.user_id,
            dateCreated: event.date_created
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let currentData = ctx.input.currentData || {};
      let activityType = ctx.input.objectType.replace('activity.', '');
      let body = currentData.body_text || currentData.note || currentData.body_preview || '';
      let bodyPreview = body.length > 200 ? `${body.substring(0, 200)}...` : body;

      return {
        type: `activity.${activityType}.${ctx.input.eventAction}`,
        id: ctx.input.eventId,
        output: {
          activityId: ctx.input.objectId,
          activityType,
          action: ctx.input.eventAction,
          changedFields: ctx.input.changedFields,
          leadId: currentData.lead_id,
          contactId: currentData.contact_id,
          subject: currentData.subject,
          bodyPreview,
          direction: currentData.direction,
          status: currentData.status,
          userId: ctx.input.userId,
          dateCreated: ctx.input.dateCreated
        }
      };
    }
  })
  .build();
