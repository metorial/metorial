import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let surveyWebhook = SlateTrigger.create(spec, {
  name: 'Survey Events',
  key: 'survey_events',
  description:
    'Receives webhook events from Retently including new survey responses, score updates, customer unsubscribes, and bounced surveys. Webhooks must be configured in the Retently dashboard.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of webhook event'),
      eventId: z.string().describe('Unique identifier for this event'),
      payload: z.any().describe('Raw event payload from Retently')
    })
  )
  .output(
    z.object({
      email: z.string().optional().describe('Customer email address'),
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      companyName: z.string().optional().describe('Customer company name'),
      score: z.number().optional().describe('Survey response score'),
      comment: z.string().optional().describe('Survey response text feedback'),
      campaignName: z.string().optional().describe('Name of the campaign'),
      campaignId: z.string().optional().describe('ID of the campaign'),
      metric: z.string().optional().describe('Survey metric type (NPS, CSAT, CES, STAR)'),
      responseId: z.string().optional().describe('Feedback response ID'),
      customerId: z.string().optional().describe('Retently customer ID'),
      channel: z.string().optional().describe('Survey delivery channel'),
      tags: z.array(z.string()).optional().describe('Customer tags'),
      createdDate: z.string().optional().describe('Event creation date'),
      ratingCategory: z
        .string()
        .optional()
        .describe('Rating category (promoter, passive, detractor)'),
      companyId: z.string().optional().describe('Company ID'),
      currentScore: z.number().optional().describe('Updated campaign/company/metric score'),
      previousScore: z.number().optional().describe('Previous score before update')
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

      // Retently webhook payload structure varies by event type
      // Determine event type from payload structure
      let eventType = 'unknown';

      if (data.event) {
        // Some webhook payloads include an explicit event field
        eventType = data.event;
      } else if (data.score !== undefined && data.email) {
        eventType = 'new_response';
      } else if (
        data.nps !== undefined ||
        data.csat !== undefined ||
        data.ces !== undefined ||
        data.star !== undefined
      ) {
        if (data.companyName && data.domain) {
          eventType = 'company_score_updated';
        } else if (data.campaignId || data.campaignName) {
          eventType = 'campaign_score_updated';
        } else {
          eventType = 'metric_score_updated';
        }
      } else if (data.isBounced || data.bounced) {
        eventType = 'bounced';
      } else if (data.unsubscribed || data.isOptedOut) {
        eventType = 'unsubscribed';
      }

      // Generate a unique event ID
      let eventId =
        data.id ||
        data.responseId ||
        data.surveyId ||
        `${eventType}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      return {
        inputs: [
          {
            eventType,
            eventId: String(eventId),
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;
      let eventType = ctx.input.eventType;

      let type: string;
      switch (eventType) {
        case 'new_response':
          type = 'response.created';
          break;
        case 'campaign_score_updated':
          type = 'campaign_score.updated';
          break;
        case 'company_score_updated':
          type = 'company_score.updated';
          break;
        case 'metric_score_updated':
          type = 'metric_score.updated';
          break;
        case 'unsubscribed':
          type = 'customer.unsubscribed';
          break;
        case 'bounced':
          type = 'survey.bounced';
          break;
        default:
          type = `event.${eventType}`;
      }

      return {
        type,
        id: ctx.input.eventId,
        output: {
          email: p.email,
          firstName: p.firstName || p.first_name,
          lastName: p.lastName || p.last_name,
          companyName: p.companyName || p.company,
          score: p.score,
          comment: p.comment || p.feedback,
          campaignName: p.campaignName,
          campaignId: p.campaignId,
          metric: p.metric || p.metricsType,
          responseId: p.responseId || p.id,
          customerId: p.customerId,
          channel: p.channel,
          tags: p.tags || p.personTags,
          createdDate: p.createdDate || p.date,
          ratingCategory: p.ratingCategory,
          companyId: p.companyId,
          currentScore: p.currentScore || p.nps || p.csat || p.ces || p.star,
          previousScore: p.previousScore
        }
      };
    }
  })
  .build();
