import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let webhookPayloadSchema = z.object({
  triggeredEvent: z.string().describe('The event that triggered the webhook'),
  contactUuid: z.string().describe('Refiner UUID of the contact'),
  projectUuid: z.string().describe('UUID of the Refiner project'),
  remoteId: z.string().nullable().describe('External user ID'),
  email: z.string().nullable().describe('Email of the contact'),
  firstSeenAt: z.string().nullable().describe('ISO 8601 timestamp of first seen'),
  lastSeenAt: z.string().nullable().describe('ISO 8601 timestamp of last seen'),
  attributes: z.record(z.string(), z.unknown()).describe('Contact attributes and traits'),
  segments: z
    .array(
      z.object({
        segmentUuid: z.string().describe('UUID of the segment'),
        name: z.string().describe('Name of the segment')
      })
    )
    .describe('Segments the contact belongs to'),
  surveyUuid: z.string().nullable().describe('UUID of the survey'),
  surveyName: z.string().nullable().describe('Name of the survey'),
  responseUuid: z.string().nullable().describe('UUID of the survey response'),
  responseData: z
    .record(z.string(), z.unknown())
    .nullable()
    .describe('Survey response data (only for completed events)'),
  completedAt: z.string().nullable().describe('ISO 8601 timestamp when survey was completed'),
  dismissedAt: z.string().nullable().describe('ISO 8601 timestamp when survey was dismissed'),
  firstShownAt: z
    .string()
    .nullable()
    .describe('ISO 8601 timestamp when survey was first shown'),
  tags: z.array(z.string()).nullable().describe('Tags on the response')
});

export let surveyInteraction = SlateTrigger.create(spec, {
  name: 'Survey Interaction',
  key: 'survey_interaction',
  description:
    'Triggers when a user interacts with a survey — completes it, sees it, or dismisses it. Provides full contact data, survey details, and response data for completed surveys.'
})
  .input(
    z.object({
      triggeredEvent: z.string().describe('The event that triggered the webhook'),
      payload: z.record(z.string(), z.unknown()).describe('Raw webhook payload')
    })
  )
  .output(webhookPayloadSchema)
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let triggeredEvent = data.triggered_event ?? '';

      // Only handle survey interaction events
      let surveyEvents = ['Survey Completed', 'Saw Survey', 'Dismissed Survey'];
      if (!surveyEvents.includes(triggeredEvent)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            triggeredEvent,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.payload as any;
      let triggeredEvent = ctx.input.triggeredEvent;

      let eventTypeMap: Record<string, string> = {
        'Survey Completed': 'survey.completed',
        'Saw Survey': 'survey.seen',
        'Dismissed Survey': 'survey.dismissed'
      };

      let eventType = eventTypeMap[triggeredEvent] || 'survey.unknown';

      // Build a unique ID from available data
      let responseUuid = data.response?.uuid ?? data.uuid ?? '';
      let eventId = `${eventType}-${responseUuid}-${data.form?.uuid ?? ''}-${Date.now()}`;

      return {
        type: eventType,
        id: eventId,
        output: {
          triggeredEvent,
          contactUuid: data.uuid ?? '',
          projectUuid: data.project_uuid ?? '',
          remoteId: data.remote_id ?? null,
          email: data.email ?? null,
          firstSeenAt: data.first_seen_at ?? null,
          lastSeenAt: data.last_seen_at ?? null,
          attributes: data.attributes ?? {},
          segments: (data.segments || []).map((s: any) => ({
            segmentUuid: s.uuid,
            name: s.name
          })),
          surveyUuid: data.form?.uuid ?? null,
          surveyName: data.form?.name ?? null,
          responseUuid: data.response?.uuid ?? null,
          responseData: data.response?.data ?? null,
          completedAt: data.response?.completed_at ?? null,
          dismissedAt: data.response?.dismissed_at ?? null,
          firstShownAt: data.response?.first_shown_at ?? null,
          tags: data.response?.tags ?? null
        }
      };
    }
  })
  .build();
