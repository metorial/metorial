import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let formSubmission = SlateTrigger.create(spec, {
  name: 'Form Submission',
  key: 'form_submission',
  description:
    'Triggers when a form is submitted in a Wisepops campaign. Covers email sign-up, phone, and survey block submissions.'
})
  .input(
    z.object({
      eventType: z
        .enum(['email', 'phone', 'survey'])
        .describe('The type of form submission event.'),
      collectedAt: z
        .string()
        .describe('ISO 8601 timestamp when the submission was collected.'),
      wisepopId: z.number().describe('ID of the campaign that collected this submission.'),
      formSession: z.string().describe('UUID identifying the form session.'),
      ip: z.string().describe('IP address of the visitor.'),
      countryCode: z.string().describe('ISO country code of the visitor.'),
      fields: z
        .record(z.string(), z.string())
        .describe('Form fields submitted by the visitor.')
    })
  )
  .output(
    z.object({
      wisepopId: z.number().describe('ID of the campaign that collected the submission.'),
      formSession: z
        .string()
        .describe(
          'UUID identifying the form session, useful for merging multi-step submissions.'
        ),
      collectedAt: z
        .string()
        .describe('ISO 8601 timestamp when the submission was collected.'),
      ip: z.string().describe('IP address of the visitor.'),
      countryCode: z.string().describe('ISO country code of the visitor.'),
      fields: z
        .record(z.string(), z.string())
        .describe('Form fields submitted by the visitor (e.g. email, name, custom fields).')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(ctx.auth.token);

      // Register hooks for all three event types so we capture everything
      let emailHook = await client.createHook({
        event: 'email',
        targetUrl: `${ctx.input.webhookBaseUrl}/email`
      });

      let phoneHook = await client.createHook({
        event: 'phone',
        targetUrl: `${ctx.input.webhookBaseUrl}/phone`
      });

      let surveyHook = await client.createHook({
        event: 'survey',
        targetUrl: `${ctx.input.webhookBaseUrl}/survey`
      });

      return {
        registrationDetails: {
          emailHookId: emailHook.id,
          phoneHookId: phoneHook.id,
          surveyHookId: surveyHook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(ctx.auth.token);
      let details = ctx.input.registrationDetails as {
        emailHookId: number;
        phoneHookId: number;
        surveyHookId: number;
      };

      await client.deleteHook(details.emailHookId);
      await client.deleteHook(details.phoneHookId);
      await client.deleteHook(details.surveyHookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Array<{
        collected_at: string;
        wisepop_id: number;
        form_session: string;
        ip: string;
        country_code: string;
        fields: Record<string, string>;
      }>;

      // Determine event type from the URL path
      let url = new URL(ctx.request.url);
      let pathSegments = url.pathname.split('/');
      let lastSegment = pathSegments[pathSegments.length - 1] || 'email';
      let eventType: 'email' | 'phone' | 'survey' = 'email';
      if (lastSegment === 'phone') {
        eventType = 'phone';
      } else if (lastSegment === 'survey') {
        eventType = 'survey';
      }

      let contacts = Array.isArray(body) ? body : [body];

      return {
        inputs: contacts.map(contact => ({
          eventType,
          collectedAt: contact.collected_at,
          wisepopId: contact.wisepop_id,
          formSession: contact.form_session,
          ip: contact.ip,
          countryCode: contact.country_code,
          fields: contact.fields
        }))
      };
    },

    handleEvent: async ctx => {
      return {
        type: `form.${ctx.input.eventType}`,
        id: `${ctx.input.formSession}-${ctx.input.collectedAt}`,
        output: {
          wisepopId: ctx.input.wisepopId,
          formSession: ctx.input.formSession,
          collectedAt: ctx.input.collectedAt,
          ip: ctx.input.ip,
          countryCode: ctx.input.countryCode,
          fields: ctx.input.fields
        }
      };
    }
  })
  .build();
