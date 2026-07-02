import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let inviteeEvents = SlateTrigger.create(spec, {
  name: 'Invitee Events',
  key: 'invitee_events',
  description:
    'Triggers when an invitee schedules or cancels a Calendly event. Covers both invitee.created and invitee.canceled webhook events.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The webhook event type (invitee.created or invitee.canceled)'),
      eventUri: z.string().describe('URI of the webhook event'),
      createdAt: z.string().describe('When the webhook event was created'),
      inviteeUri: z.string().describe('URI of the invitee'),
      inviteeName: z.string().describe('Name of the invitee'),
      inviteeEmail: z.string().describe('Email of the invitee'),
      scheduledEventUri: z.string().describe('URI of the scheduled event'),
      scheduledEventName: z.string().describe('Name of the scheduled event'),
      startTime: z.string().describe('Event start time'),
      endTime: z.string().describe('Event end time'),
      status: z.string().describe('Invitee status'),
      timezone: z.string().nullable().describe('Invitee timezone'),
      questionsAndAnswers: z
        .array(
          z.object({
            question: z.string(),
            answer: z.string()
          })
        )
        .describe('Custom question responses'),
      tracking: z.any().optional().describe('UTM tracking data'),
      cancelUrl: z.string().optional().describe('Cancel URL'),
      rescheduleUrl: z.string().optional().describe('Reschedule URL'),
      rescheduled: z.boolean().optional().describe('Whether this is a rescheduled event'),
      cancellation: z.any().optional().describe('Cancellation details if canceled'),
      eventMemberships: z
        .array(
          z.object({
            userUri: z.string(),
            userEmail: z.string(),
            userName: z.string()
          })
        )
        .optional()
        .describe('Event hosts/members')
    })
  )
  .output(
    z.object({
      inviteeUri: z.string().describe('URI of the invitee'),
      inviteeName: z.string().describe('Name of the invitee'),
      inviteeEmail: z.string().describe('Email of the invitee'),
      scheduledEventUri: z.string().describe('URI of the scheduled event'),
      scheduledEventName: z.string().describe('Name of the scheduled event'),
      startTime: z.string().describe('Event start time (ISO 8601)'),
      endTime: z.string().describe('Event end time (ISO 8601)'),
      status: z.string().describe('Invitee status (active or canceled)'),
      timezone: z.string().nullable().describe('Invitee timezone'),
      questionsAndAnswers: z
        .array(
          z.object({
            question: z.string(),
            answer: z.string()
          })
        )
        .describe('Custom question responses'),
      tracking: z.any().optional().describe('UTM tracking data'),
      cancelUrl: z.string().optional().describe('URL for invitee to cancel'),
      rescheduleUrl: z.string().optional().describe('URL for invitee to reschedule'),
      rescheduled: z
        .boolean()
        .optional()
        .describe('Whether this is a reschedule of a previous event'),
      cancellation: z
        .any()
        .optional()
        .describe('Cancellation details (reason, canceled_by, etc.)'),
      eventMemberships: z
        .array(
          z.object({
            userUri: z.string(),
            userEmail: z.string(),
            userName: z.string()
          })
        )
        .optional()
        .describe('Event hosts/members')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let organizationUri = ctx.auth.organizationUri;
      let userUri = ctx.auth.userUri;

      if (!organizationUri) {
        let user = await client.getCurrentUser();
        organizationUri = user.currentOrganization;
        userUri = user.uri;
      }

      let scope: 'user' | 'organization' = organizationUri ? 'organization' : 'user';

      let webhook = await client.createWebhookSubscription({
        url: ctx.input.webhookBaseUrl,
        events: ['invitee.created', 'invitee.canceled'],
        organizationUri: organizationUri!,
        scope,
        userUri: scope === 'user' ? userUri : undefined
      });

      return {
        registrationDetails: {
          webhookUri: webhook.uri
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookUri: string };
      await client.deleteWebhookSubscription(details.webhookUri);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let event = body.event as string;
      let payload = body.payload || {};

      let scheduledEvent = payload.scheduled_event || {};
      let eventMemberships = (scheduledEvent.event_memberships || []).map((m: any) => ({
        userUri: m.user,
        userEmail: m.user_email,
        userName: m.user_name
      }));

      let questionsAndAnswers = (payload.questions_and_answers || []).map((qa: any) => ({
        question: qa.question,
        answer: qa.answer
      }));

      return {
        inputs: [
          {
            eventType: event,
            eventUri: payload.uri || '',
            createdAt: payload.created_at || body.created_at || '',
            inviteeUri: payload.uri || '',
            inviteeName: payload.name || '',
            inviteeEmail: payload.email || '',
            scheduledEventUri: scheduledEvent.uri || payload.event || '',
            scheduledEventName: scheduledEvent.name || payload.event_type?.name || '',
            startTime: scheduledEvent.start_time || payload.calendar_event?.start_time || '',
            endTime: scheduledEvent.end_time || payload.calendar_event?.end_time || '',
            status: payload.status || (event === 'invitee.canceled' ? 'canceled' : 'active'),
            timezone: payload.timezone || null,
            questionsAndAnswers,
            tracking: payload.tracking || undefined,
            cancelUrl: payload.cancel_url || undefined,
            rescheduleUrl: payload.reschedule_url || undefined,
            rescheduled: payload.rescheduled || false,
            cancellation: payload.cancellation || undefined,
            eventMemberships
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let type =
        ctx.input.eventType === 'invitee.canceled' ? 'invitee.canceled' : 'invitee.created';

      return {
        type,
        id: ctx.input.inviteeUri || `${ctx.input.scheduledEventUri}-${ctx.input.createdAt}`,
        output: {
          inviteeUri: ctx.input.inviteeUri,
          inviteeName: ctx.input.inviteeName,
          inviteeEmail: ctx.input.inviteeEmail,
          scheduledEventUri: ctx.input.scheduledEventUri,
          scheduledEventName: ctx.input.scheduledEventName,
          startTime: ctx.input.startTime,
          endTime: ctx.input.endTime,
          status: ctx.input.status,
          timezone: ctx.input.timezone,
          questionsAndAnswers: ctx.input.questionsAndAnswers,
          tracking: ctx.input.tracking,
          cancelUrl: ctx.input.cancelUrl,
          rescheduleUrl: ctx.input.rescheduleUrl,
          rescheduled: ctx.input.rescheduled,
          cancellation: ctx.input.cancellation,
          eventMemberships: ctx.input.eventMemberships
        }
      };
    }
  })
  .build();
