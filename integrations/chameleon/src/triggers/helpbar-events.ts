import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

export let helpbarEvents = SlateTrigger.create(spec, {
  name: 'HelpBar Events',
  key: 'helpbar_events',
  description:
    'Triggers when a user interacts with the Chameleon HelpBar: search queries, AI answers, item actions, and item errors.'
})
  .input(
    z.object({
      eventType: z.string().describe('Webhook topic type'),
      webhookId: z.string().describe('Chameleon webhook event ID'),
      sentAt: z.string().describe('Timestamp when the webhook was sent'),
      profileId: z.string().optional().describe('User profile ID'),
      profileUid: z.string().optional().describe('External user identifier'),
      profileEmail: z.string().optional().describe('User email'),
      query: z.string().optional().describe('Search query text'),
      answer: z.string().optional().describe('AI-generated answer text'),
      itemTitle: z.string().optional().describe('HelpBar item title'),
      itemUrl: z.string().optional().describe('HelpBar item URL'),
      errorMessage: z.string().optional().describe('Error message if item failed'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      profileId: z.string().optional().describe('User profile ID'),
      profileUid: z.string().optional().describe('External user identifier'),
      profileEmail: z.string().optional().describe('User email'),
      query: z.string().optional().describe('Search query text'),
      answer: z.string().optional().describe('AI-generated answer'),
      itemTitle: z.string().optional().describe('HelpBar item title'),
      itemUrl: z.string().optional().describe('HelpBar item URL'),
      errorMessage: z.string().optional().describe('Error message if applicable'),
      sentAt: z.string().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ChameleonClient(ctx.auth.token);
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        topics: [
          'helpbar.search',
          'helpbar.answer',
          'helpbar.item.action',
          'helpbar.item.error'
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
      let search = (data.search as Record<string, unknown>) || {};
      let item = (data.item as Record<string, unknown>) || {};
      let answerData = (data.answer as Record<string, unknown>) || {};

      return {
        inputs: [
          {
            eventType: kind,
            webhookId: body.id as string,
            sentAt: body.sent_at as string,
            profileId: profile.id as string | undefined,
            profileUid: profile.uid as string | undefined,
            profileEmail: profile.email as string | undefined,
            query: (search.query || search.text) as string | undefined,
            answer: (answerData.text || answerData.content) as string | undefined,
            itemTitle: item.title as string | undefined,
            itemUrl: item.url as string | undefined,
            errorMessage: item.error as string | undefined,
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
          profileId: ctx.input.profileId,
          profileUid: ctx.input.profileUid,
          profileEmail: ctx.input.profileEmail,
          query: ctx.input.query,
          answer: ctx.input.answer,
          itemTitle: ctx.input.itemTitle,
          itemUrl: ctx.input.itemUrl,
          errorMessage: ctx.input.errorMessage,
          sentAt: ctx.input.sentAt
        }
      };
    }
  })
  .build();
