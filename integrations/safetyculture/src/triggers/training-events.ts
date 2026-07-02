import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let trainingTriggerEvents = [
  'TRIGGER_EVENT_TRAINING_COURSE_CREATED',
  'TRIGGER_EVENT_TRAINING_COURSE_UPDATED',
  'TRIGGER_EVENT_TRAINING_COURSE_PUBLISHED',
  'TRIGGER_EVENT_TRAINING_COURSE_REPUBLISHED',
  'TRIGGER_EVENT_TRAINING_COURSE_UNPUBLISHED',
  'TRIGGER_EVENT_TRAINING_COURSE_DELETED',
  'TRIGGER_EVENT_TRAINING_LESSON_CREATED',
  'TRIGGER_EVENT_TRAINING_LESSON_UPDATED',
  'TRIGGER_EVENT_TRAINING_LESSON_PUBLISHED',
  'TRIGGER_EVENT_TRAINING_LESSON_UNPUBLISHED',
  'TRIGGER_EVENT_TRAINING_LESSON_DELETED',
  'TRIGGER_EVENT_TRAINING_COURSE_ENROLLED',
  'TRIGGER_EVENT_TRAINING_COURSE_OPENED',
  'TRIGGER_EVENT_TRAINING_COURSE_COMPLETED',
  'TRIGGER_EVENT_TRAINING_COURSE_EXPIRED',
  'TRIGGER_EVENT_TRAINING_COURSE_RESET',
  'TRIGGER_EVENT_TRAINING_LESSON_OPENED',
  'TRIGGER_EVENT_TRAINING_LESSON_COMPLETED'
];

export let trainingEvents = SlateTrigger.create(spec, {
  name: 'Training Events',
  key: 'training_events',
  description:
    'Triggers on training-related events including course and lesson creation, publishing, enrollment, completion, and progress changes.'
})
  .input(
    z.object({
      webhookId: z.string().describe('Webhook ID'),
      eventTypes: z.array(z.string()).describe('Event types that triggered this event'),
      resourceId: z.string().describe('Resource ID (course or lesson)'),
      resourceType: z.string().describe('Resource type'),
      triggeredAt: z.string().describe('Timestamp of the event'),
      triggeredByUserId: z.string().optional().describe('User who triggered the event'),
      organisationId: z.string().optional().describe('Organization ID'),
      eventData: z.any().optional().describe('Additional event-specific data')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('ID of the affected training resource'),
      eventTypes: z.array(z.string()).describe('Event types'),
      triggeredAt: z.string().describe('When the event occurred'),
      triggeredByUserId: z.string().optional().describe('User who triggered the event'),
      organisationId: z.string().optional().describe('Organization ID'),
      resourceType: z.string().optional().describe('Resource type'),
      eventData: z.any().optional().describe('Additional event data')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        triggerEvents: trainingTriggerEvents
      });

      return {
        registrationDetails: {
          webhookId: result.webhook_id || result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      return {
        inputs: [
          {
            webhookId: data.webhook_id || '',
            eventTypes: data.event?.event_types || [],
            resourceId: data.resource?.id || '',
            resourceType: data.resource?.type || '',
            triggeredAt: data.event?.date_triggered || new Date().toISOString(),
            triggeredByUserId: data.event?.triggered_by?.user,
            organisationId: data.event?.triggered_by?.organization,
            eventData: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = 'training.updated';
      let types = ctx.input.eventTypes;

      if (types.includes('TRIGGER_EVENT_TRAINING_COURSE_CREATED')) {
        eventType = 'training.course_created';
      } else if (types.includes('TRIGGER_EVENT_TRAINING_COURSE_PUBLISHED')) {
        eventType = 'training.course_published';
      } else if (types.includes('TRIGGER_EVENT_TRAINING_COURSE_COMPLETED')) {
        eventType = 'training.course_completed';
      } else if (types.includes('TRIGGER_EVENT_TRAINING_COURSE_ENROLLED')) {
        eventType = 'training.course_enrolled';
      } else if (types.includes('TRIGGER_EVENT_TRAINING_COURSE_DELETED')) {
        eventType = 'training.course_deleted';
      } else if (types.includes('TRIGGER_EVENT_TRAINING_LESSON_CREATED')) {
        eventType = 'training.lesson_created';
      } else if (types.includes('TRIGGER_EVENT_TRAINING_LESSON_COMPLETED')) {
        eventType = 'training.lesson_completed';
      } else if (types.includes('TRIGGER_EVENT_TRAINING_LESSON_PUBLISHED')) {
        eventType = 'training.lesson_published';
      } else if (types.includes('TRIGGER_EVENT_TRAINING_LESSON_DELETED')) {
        eventType = 'training.lesson_deleted';
      }

      return {
        type: eventType,
        id: `${ctx.input.webhookId}-${ctx.input.resourceId}-${ctx.input.triggeredAt}`,
        output: {
          resourceId: ctx.input.resourceId,
          eventTypes: ctx.input.eventTypes,
          triggeredAt: ctx.input.triggeredAt,
          triggeredByUserId: ctx.input.triggeredByUserId,
          organisationId: ctx.input.organisationId,
          resourceType: ctx.input.resourceType,
          eventData: ctx.input.eventData
        }
      };
    }
  })
  .build();
