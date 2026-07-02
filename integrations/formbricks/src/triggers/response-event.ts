import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let responseEvent = SlateTrigger.create(spec, {
  name: 'Response Event',
  key: 'response_event',
  description:
    'Triggers when a survey response is created, updated, or completed. Webhooks can be scoped to specific surveys.'
})
  .input(
    z.object({
      eventType: z
        .enum(['responseCreated', 'responseUpdated', 'responseFinished'])
        .describe('Type of response event'),
      webhookId: z.string().describe('ID of the webhook that sent this event'),
      responseId: z.string().describe('ID of the response'),
      surveyId: z.string().describe('ID of the associated survey'),
      finished: z.boolean().describe('Whether the response is complete'),
      answers: z.record(z.string(), z.any()).describe('Response answers keyed by question ID'),
      meta: z.any().optional().describe('Response metadata (country, browser, OS, device)'),
      contactAttributes: z.any().optional().describe('Contact attributes of the respondent'),
      ttc: z
        .record(z.string(), z.any())
        .optional()
        .describe('Time-to-completion per question'),
      surveyName: z.string().optional().describe('Name of the associated survey'),
      surveyStatus: z.string().optional().describe('Status of the associated survey'),
      surveyType: z.string().optional().describe('Type of the associated survey'),
      createdAt: z.string().optional().describe('Response creation timestamp'),
      updatedAt: z.string().optional().describe('Response last update timestamp'),
      endingId: z
        .string()
        .optional()
        .describe('ID of the ending shown (for finished responses)')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('ID of the response'),
      surveyId: z.string().describe('ID of the associated survey'),
      surveyName: z.string().optional().describe('Name of the associated survey'),
      finished: z.boolean().describe('Whether the response is complete'),
      answers: z.record(z.string(), z.any()).describe('Response answers keyed by question ID'),
      meta: z.any().optional().describe('Response metadata'),
      contactAttributes: z.any().optional().describe('Respondent contact attributes'),
      ttc: z
        .record(z.string(), z.any())
        .optional()
        .describe('Time-to-completion per question'),
      createdAt: z.string().optional().describe('Response creation timestamp'),
      updatedAt: z.string().optional().describe('Response last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        triggers: ['responseCreated', 'responseUpdated', 'responseFinished']
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = await ctx.request.json();

      // Formbricks sends an array of webhook event objects
      let events: any[] = Array.isArray(body) ? body : [body];

      let inputs = events.map((event: any) => {
        let data = event.data ?? {};
        let survey = data.survey ?? {};

        return {
          eventType: event.event as 'responseCreated' | 'responseUpdated' | 'responseFinished',
          webhookId: event.webhookId ?? '',
          responseId: data.id ?? '',
          surveyId: data.surveyId ?? '',
          finished: data.finished ?? false,
          answers: data.data ?? {},
          meta: data.meta,
          contactAttributes: data.contactAttributes,
          ttc: data.ttc,
          surveyName: survey.name,
          surveyStatus: survey.status,
          surveyType: survey.type,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          endingId: data.endingId
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventTypeMap: Record<string, string> = {
        responseCreated: 'response.created',
        responseUpdated: 'response.updated',
        responseFinished: 'response.finished'
      };

      return {
        type: eventTypeMap[ctx.input.eventType] ?? `response.${ctx.input.eventType}`,
        id: `${ctx.input.responseId}-${ctx.input.eventType}-${ctx.input.updatedAt ?? ctx.input.createdAt ?? Date.now()}`,
        output: {
          responseId: ctx.input.responseId,
          surveyId: ctx.input.surveyId,
          surveyName: ctx.input.surveyName,
          finished: ctx.input.finished,
          answers: ctx.input.answers,
          meta: ctx.input.meta,
          contactAttributes: ctx.input.contactAttributes,
          ttc: ctx.input.ttc,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
