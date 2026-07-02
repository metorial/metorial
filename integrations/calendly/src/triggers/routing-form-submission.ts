import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let routingFormSubmission = SlateTrigger.create(spec, {
  name: 'Routing Form Submission',
  key: 'routing_form_submission',
  description:
    'Triggers when someone submits a routing form, whether they book a meeting or not. Only supports organization-scoped subscriptions.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type'),
      submissionUri: z.string().describe('URI of the submission'),
      routingFormUri: z.string().describe('URI of the routing form'),
      questionsAndAnswers: z
        .array(
          z.object({
            questionUuid: z.string(),
            question: z.string(),
            answer: z.string()
          })
        )
        .describe('Questions and answers from the submission'),
      tracking: z.any().optional().describe('Tracking data'),
      result: z.any().optional().describe('Where the submitter was routed'),
      submitter: z.string().nullable().describe('Submitter identifier'),
      submitterType: z.string().nullable().describe('Type of submitter'),
      createdAt: z.string().describe('When the submission was created')
    })
  )
  .output(
    z.object({
      submissionUri: z.string().describe('URI of the routing form submission'),
      routingFormUri: z.string().describe('URI of the routing form'),
      questionsAndAnswers: z
        .array(
          z.object({
            questionUuid: z.string(),
            question: z.string(),
            answer: z.string()
          })
        )
        .describe('Questions and answers from the submission'),
      tracking: z.any().optional().describe('UTM tracking data'),
      result: z.any().optional().describe('Routing result (where the submitter was directed)'),
      submitter: z.string().nullable().describe('Submitter identifier'),
      submitterType: z.string().nullable().describe('Type of submitter (e.g., Invitee)'),
      createdAt: z.string().describe('When the submission was created (ISO 8601)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let organizationUri = ctx.auth.organizationUri;

      if (!organizationUri) {
        let user = await client.getCurrentUser();
        organizationUri = user.currentOrganization;
      }

      let webhook = await client.createWebhookSubscription({
        url: ctx.input.webhookBaseUrl,
        events: ['routing_form_submission.created'],
        organizationUri: organizationUri!,
        scope: 'organization'
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

      let payload = body.payload || {};
      let questionsAndAnswers = (payload.questions_and_answers || []).map((qa: any) => ({
        questionUuid: qa.question_uuid || qa.uuid || '',
        question: qa.question || '',
        answer: qa.answer || ''
      }));

      return {
        inputs: [
          {
            eventType: body.event || 'routing_form_submission.created',
            submissionUri: payload.uri || '',
            routingFormUri: payload.routing_form || '',
            questionsAndAnswers,
            tracking: payload.tracking || undefined,
            result: payload.result || undefined,
            submitter: payload.submitter || null,
            submitterType: payload.submitter_type || null,
            createdAt: payload.created_at || body.created_at || ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'routing_form_submission.created',
        id: ctx.input.submissionUri || `routing-${ctx.input.createdAt}`,
        output: {
          submissionUri: ctx.input.submissionUri,
          routingFormUri: ctx.input.routingFormUri,
          questionsAndAnswers: ctx.input.questionsAndAnswers,
          tracking: ctx.input.tracking,
          result: ctx.input.result,
          submitter: ctx.input.submitter,
          submitterType: ctx.input.submitterType,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
