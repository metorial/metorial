import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

export let tourEvents = SlateTrigger.create(spec, {
  name: 'Tour Events',
  key: 'tour_events',
  description:
    'Triggers when a user interacts with a Chameleon tour: started, completed, exited, snoozed, or button clicked.'
})
  .input(
    z.object({
      eventType: z.string().describe('Webhook topic type'),
      webhookId: z.string().describe('Chameleon webhook event ID'),
      sentAt: z.string().describe('Timestamp when the webhook was sent'),
      tourId: z.string().optional().describe('Tour ID'),
      tourName: z.string().optional().describe('Tour name'),
      profileId: z.string().optional().describe('User profile ID'),
      profileUid: z.string().optional().describe('External user identifier'),
      profileEmail: z.string().optional().describe('User email'),
      stepId: z.string().optional().describe('Current step ID'),
      buttonText: z.string().optional().describe('Clicked button text'),
      href: z.string().optional().describe('Page URL'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      tourId: z.string().describe('Tour ID'),
      tourName: z.string().optional().describe('Tour name'),
      profileId: z.string().optional().describe('User profile ID'),
      profileUid: z.string().optional().describe('External user identifier'),
      profileEmail: z.string().optional().describe('User email'),
      stepId: z.string().optional().describe('Current step ID'),
      buttonText: z.string().optional().describe('Clicked button text'),
      href: z.string().optional().describe('Page URL when event occurred'),
      sentAt: z.string().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ChameleonClient(ctx.auth.token);
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        topics: [
          'tour.started',
          'tour.completed',
          'tour.exited',
          'tour.snoozed',
          'tour.button.clicked'
        ]
      });
      return {
        registrationDetails: { webhookId: result.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ChameleonClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;
      let kind = body.kind as string;

      if (kind === 'ping') {
        return { inputs: [] };
      }

      let data = (body.data as Record<string, unknown>) || {};
      let profile = (data.profile as Record<string, unknown>) || {};
      let tour = (data.tour as Record<string, unknown>) || {};
      let step = (data.step as Record<string, unknown>) || {};
      let button = (data.button as Record<string, unknown>) || {};
      let action = (data.action as Record<string, unknown>) || {};

      return {
        inputs: [
          {
            eventType: kind,
            webhookId: body.id as string,
            sentAt: body.sent_at as string,
            tourId: tour.id as string | undefined,
            tourName: tour.name as string | undefined,
            profileId: profile.id as string | undefined,
            profileUid: profile.uid as string | undefined,
            profileEmail: profile.email as string | undefined,
            stepId: step.id as string | undefined,
            buttonText: button.text as string | undefined,
            href: (action.href || action.at_href) as string | undefined,
            raw: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.webhookId,
        output: {
          tourId: ctx.input.tourId || '',
          tourName: ctx.input.tourName,
          profileId: ctx.input.profileId,
          profileUid: ctx.input.profileUid,
          profileEmail: ctx.input.profileEmail,
          stepId: ctx.input.stepId,
          buttonText: ctx.input.buttonText,
          href: ctx.input.href,
          sentAt: ctx.input.sentAt
        }
      };
    }
  })
  .build();
