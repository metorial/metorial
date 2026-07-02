import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pollEvents = SlateTrigger.create(spec, {
  name: 'Poll Vote Events',
  key: 'poll_events',
  description:
    'Triggers when a recipient votes on a poll embedded in a Mixmax email. Captures the poll question, selected answer, and respondent details.'
})
  .input(
    z.object({
      eventName: z.string().describe('Event type (poll:voted)'),
      eventId: z.string().describe('Unique event identifier'),
      payload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      pollId: z.string().optional().describe('Poll ID'),
      question: z.string().optional().describe('Poll question'),
      vote: z.string().optional().describe('Selected vote/answer'),
      respondentEmail: z.string().optional().describe('Respondent email'),
      respondentName: z.string().optional().describe('Respondent name'),
      respondedAt: z.string().optional().describe('When the vote was cast'),
      userId: z.string().optional().describe('Mixmax user ID who created the poll')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let rule = await client.createRule({
        name: 'Slates: Poll Voted Webhook',
        trigger: { event: 'poll:voted' },
        actions: [
          {
            type: 'webhook',
            url: ctx.input.webhookBaseUrl
          }
        ],
        enabled: true
      });

      return {
        registrationDetails: { ruleId: rule._id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { ruleId: string };

      if (details.ruleId) {
        await client.deleteRule(details.ruleId).catch(() => {});
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;

      let eventId =
        data.id ||
        `poll-voted-${data.poll?._id || data.poll?.pollId}-${data.respondent?.email}-${data.timestamp || Date.now()}`;

      return {
        inputs: [
          {
            eventName: data.eventName || 'poll:voted',
            eventId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;

      return {
        type: 'poll.voted',
        id: ctx.input.eventId,
        output: {
          pollId: p.poll?._id || p.poll?.pollId,
          question: p.poll?.question,
          vote: p.vote,
          respondentEmail: p.respondent?.email,
          respondentName: p.respondent?.name,
          respondedAt: p.respondent?.respondedAt || p.timestamp,
          userId: p.poll?.userId
        }
      };
    }
  })
  .build();
