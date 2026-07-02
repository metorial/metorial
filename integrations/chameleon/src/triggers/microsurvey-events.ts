import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

export let microsurveyEvents = SlateTrigger.create(spec, {
  name: 'Microsurvey Events',
  key: 'microsurvey_events',
  description:
    'Triggers when a user interacts with a Chameleon microsurvey: started, completed, exited, snoozed, button clicked, or response submitted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Webhook topic type'),
      webhookId: z.string().describe('Chameleon webhook event ID'),
      sentAt: z.string().describe('Timestamp when the webhook was sent'),
      surveyId: z.string().optional().describe('Microsurvey ID'),
      surveyName: z.string().optional().describe('Microsurvey name'),
      profileId: z.string().optional().describe('User profile ID'),
      profileUid: z.string().optional().describe('External user identifier'),
      profileEmail: z.string().optional().describe('User email'),
      buttonText: z.string().optional().describe('Clicked button text'),
      inputText: z.string().optional().describe('User text input'),
      dropdownItems: z.string().optional().describe('Selected dropdown items'),
      href: z.string().optional().describe('Page URL'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      surveyId: z.string().describe('Microsurvey ID'),
      surveyName: z.string().optional().describe('Microsurvey name'),
      profileId: z.string().optional().describe('User profile ID'),
      profileUid: z.string().optional().describe('External user identifier'),
      profileEmail: z.string().optional().describe('User email'),
      buttonText: z.string().optional().describe('Clicked button text or selected option'),
      inputText: z.string().optional().describe('User text input/comment'),
      dropdownItems: z.string().optional().describe('Selected dropdown items'),
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
          'survey.started',
          'survey.completed',
          'survey.exited',
          'survey.snoozed',
          'survey.button.clicked',
          'response.finished'
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
      let survey = (data.survey as Record<string, unknown>) || {};
      let response = (data.response as Record<string, unknown>) || {};
      let button = (data.button as Record<string, unknown>) || {};
      let action = (data.action as Record<string, unknown>) || {};

      return {
        inputs: [
          {
            eventType: kind,
            webhookId: body.id as string,
            sentAt: body.sent_at as string,
            surveyId: survey.id as string | undefined,
            surveyName: survey.name as string | undefined,
            profileId: profile.id as string | undefined,
            profileUid: profile.uid as string | undefined,
            profileEmail: profile.email as string | undefined,
            buttonText: (button.text || response.button_text) as string | undefined,
            inputText: response.input_text as string | undefined,
            dropdownItems: response.dropdown_items as string | undefined,
            href: (action.href || response.href) as string | undefined,
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
          surveyId: ctx.input.surveyId || '',
          surveyName: ctx.input.surveyName,
          profileId: ctx.input.profileId,
          profileUid: ctx.input.profileUid,
          profileEmail: ctx.input.profileEmail,
          buttonText: ctx.input.buttonText,
          inputText: ctx.input.inputText,
          dropdownItems: ctx.input.dropdownItems,
          href: ctx.input.href,
          sentAt: ctx.input.sentAt
        }
      };
    }
  })
  .build();
