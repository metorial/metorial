import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let responseEvent = SlateTrigger.create(spec, {
  name: 'Survey Response Event',
  key: 'response_event',
  description:
    'Triggers when a survey response is completed, updated, or disqualified. Registers webhooks with SurveyMonkey to receive real-time notifications for response events on specified surveys.'
})
  .input(
    z.object({
      eventType: z
        .enum(['response_completed', 'response_updated', 'response_disqualified'])
        .describe('Type of response event'),
      eventId: z.string().describe('Unique event identifier'),
      name: z.string().optional().describe('Webhook name'),
      filterType: z.string().optional().describe('Filter type (survey or collector)'),
      filterId: z
        .string()
        .optional()
        .describe('ID of the survey or collector that triggered the event'),
      objectType: z.string().optional().describe('Type of object (response)'),
      objectId: z.string().optional().describe('ID of the response'),
      eventDatetime: z.string().optional().describe('ISO 8601 timestamp of the event'),
      resources: z
        .object({
          respondentId: z.string().optional(),
          recipientId: z.string().optional(),
          collectorId: z.string().optional(),
          surveyId: z.string().optional(),
          userId: z.string().optional()
        })
        .optional()
        .describe('Related resource IDs')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('ID of the affected response'),
      surveyId: z.string().optional().describe('ID of the survey'),
      collectorId: z.string().optional().describe('ID of the collector'),
      respondentId: z.string().optional().describe('ID of the respondent'),
      recipientId: z.string().optional().describe('ID of the recipient'),
      userId: z.string().optional().describe('ID of the user'),
      eventDatetime: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accessUrl: ctx.auth.accessUrl
      });

      // Register three webhooks for the three response event types
      // Each subscription_url must be unique per SurveyMonkey's requirements
      let eventTypes = ['response_completed', 'response_updated', 'response_disqualified'];
      let registeredWebhooks: Array<{ webhookId: string; eventType: string }> = [];

      // Fetch the user's surveys to subscribe to
      let surveysResult = await client.listSurveys({ perPage: 100 });
      let surveyIds = (surveysResult.data || []).map((s: any) => s.id as string);

      if (surveyIds.length > 0) {
        for (let eventType of eventTypes) {
          try {
            let subscriptionUrl = `${ctx.input.webhookBaseUrl}/${eventType}`;

            let webhook = await client.createWebhook({
              name: `slates_${eventType}`,
              eventType,
              objectType: 'survey',
              objectIds: surveyIds,
              subscriptionUrl
            });

            registeredWebhooks.push({
              webhookId: webhook.id,
              eventType
            });
          } catch (_e) {
            // Some event types may not be available, continue with others
          }
        }
      }

      return {
        registrationDetails: { webhooks: registeredWebhooks }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accessUrl: ctx.auth.accessUrl
      });

      let details = ctx.input.registrationDetails as
        | { webhooks?: Array<{ webhookId: string }> }
        | undefined;
      let webhooks = details?.webhooks || [];

      for (let wh of webhooks) {
        try {
          await client.deleteWebhook(wh.webhookId);
        } catch (_e) {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let method = ctx.request.method;

      // SurveyMonkey sends a HEAD request to verify the subscription URL
      if (method === 'HEAD') {
        return { inputs: [] };
      }

      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event_type,
            eventId:
              data.event_id || `${data.event_type}_${data.object_id}_${data.event_datetime}`,
            name: data.name,
            filterType: data.filter_type,
            filterId: data.filter_id,
            objectType: data.object_type,
            objectId: data.object_id,
            eventDatetime: data.event_datetime,
            resources: data.resources
              ? {
                  respondentId: data.resources.respondent_id,
                  recipientId: data.resources.recipient_id,
                  collectorId: data.resources.collector_id,
                  surveyId: data.resources.survey_id,
                  userId: data.resources.user_id
                }
              : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let responseId =
        ctx.input.objectId || ctx.input.resources?.respondentId || ctx.input.eventId;

      return {
        type: `response.${ctx.input.eventType.replace('response_', '')}`,
        id: ctx.input.eventId,
        output: {
          responseId,
          surveyId: ctx.input.resources?.surveyId || ctx.input.filterId,
          collectorId: ctx.input.resources?.collectorId,
          respondentId: ctx.input.resources?.respondentId,
          recipientId: ctx.input.resources?.recipientId,
          userId: ctx.input.resources?.userId,
          eventDatetime: ctx.input.eventDatetime
        }
      };
    }
  })
  .build();
