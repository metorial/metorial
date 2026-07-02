import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newFeedback = SlateTrigger.create(spec, {
  name: 'New Feedback',
  key: 'new_feedback',
  description:
    '[Polling fallback] Polls for new survey responses. Triggers when a new feedback response is received, providing the score, comment, customer details, and campaign info.'
})
  .input(
    z.object({
      responseId: z.string().describe('Feedback response ID'),
      email: z.string().optional().describe('Customer email'),
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      companyName: z.string().optional().describe('Customer company name'),
      score: z.number().optional().describe('Survey score'),
      comment: z.string().optional().describe('Feedback text'),
      campaignName: z.string().optional().describe('Campaign name'),
      campaignId: z.string().optional().describe('Campaign ID'),
      metric: z.string().optional().describe('Survey metric type'),
      channel: z.string().optional().describe('Delivery channel'),
      ratingCategory: z.string().optional().describe('Rating category'),
      createdDate: z.string().optional().describe('Response date'),
      tags: z.array(z.string()).optional().describe('Customer tags'),
      feedbackTopics: z
        .array(
          z.object({
            name: z.string(),
            sentiment: z.string()
          })
        )
        .optional()
        .describe('Assigned topics'),
      feedbackTags: z.array(z.string()).optional().describe('Assigned feedback tags')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('Feedback response ID'),
      email: z.string().optional().describe('Customer email'),
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      companyName: z.string().optional().describe('Customer company name'),
      score: z.number().optional().describe('Survey score'),
      comment: z.string().optional().describe('Feedback text'),
      campaignName: z.string().optional().describe('Campaign name'),
      campaignId: z.string().optional().describe('Campaign ID'),
      metric: z.string().optional().describe('Survey metric type (NPS, CSAT, CES, STAR)'),
      channel: z.string().optional().describe('Delivery channel'),
      ratingCategory: z
        .string()
        .optional()
        .describe('Rating category (e.g., promoter, passive, detractor)'),
      createdDate: z.string().optional().describe('When the response was submitted'),
      tags: z.array(z.string()).optional().describe('Customer tags'),
      feedbackTopics: z
        .array(
          z.object({
            name: z.string(),
            sentiment: z.string()
          })
        )
        .optional()
        .describe('Assigned feedback topics with sentiment'),
      feedbackTags: z.array(z.string()).optional().describe('Assigned feedback tags')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client(ctx.auth.token);

      let lastPollDate = (ctx.state as any)?.lastPollDate as string | undefined;

      let params: Record<string, unknown> = {
        sort: '-createdDate',
        limit: 100
      };

      if (lastPollDate) {
        params.startDate = lastPollDate;
      }

      let data = await client.getFeedback(params as any);
      let responses: any[] = data.responses || [];

      let newLastPollDate = lastPollDate;
      if (responses.length > 0 && responses[0]!.createdDate) {
        newLastPollDate = responses[0]!.createdDate;
      }

      // If this is the first poll and there's no lastPollDate, only store the state without emitting old events
      if (!lastPollDate) {
        return {
          inputs: [],
          updatedState: {
            lastPollDate: newLastPollDate || new Date().toISOString()
          }
        };
      }

      let inputs = responses.map((r: any) => ({
        responseId: r.id,
        email: r.email,
        firstName: r.firstName,
        lastName: r.lastName,
        companyName: r.companyName,
        score: r.score,
        comment: r.comment,
        campaignName: r.campaignName,
        campaignId: r.campaignId,
        metric: r.metricsType,
        channel: r.channel,
        ratingCategory: r.ratingCategory,
        createdDate: r.createdDate,
        tags: r.tags,
        feedbackTopics: r.feedbackTopics,
        feedbackTags: r.feedbackTags || r.feedbackTagsNew
      }));

      return {
        inputs,
        updatedState: {
          lastPollDate: newLastPollDate || lastPollDate
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'response.created',
        id: ctx.input.responseId,
        output: {
          responseId: ctx.input.responseId,
          email: ctx.input.email,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          companyName: ctx.input.companyName,
          score: ctx.input.score,
          comment: ctx.input.comment,
          campaignName: ctx.input.campaignName,
          campaignId: ctx.input.campaignId,
          metric: ctx.input.metric,
          channel: ctx.input.channel,
          ratingCategory: ctx.input.ratingCategory,
          createdDate: ctx.input.createdDate,
          tags: ctx.input.tags,
          feedbackTopics: ctx.input.feedbackTopics,
          feedbackTags: ctx.input.feedbackTags
        }
      };
    }
  })
  .build();
