import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let templateEvents = SlateTrigger.create(spec, {
  name: 'Template Events',
  key: 'template_events',
  description:
    'Triggers when template-related events occur, such as when a template is created or encounters an error.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of event (template_created or template_error)'),
      eventTime: z.string().describe('Unix timestamp when the event occurred'),
      eventHash: z.string().describe('HMAC hash for event verification'),
      reportedForAccountId: z
        .string()
        .optional()
        .describe('Account ID this event is reported for'),
      template: z.any().describe('Template object from the event payload')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the template'),
      title: z.string().optional().describe('Title of the template'),
      message: z.string().optional().describe('Template message'),
      signerRoles: z
        .array(
          z.object({
            name: z.string().describe('Role name'),
            order: z.number().optional().describe('Signing order')
          })
        )
        .optional()
        .describe('Defined signer roles'),
      ccRoles: z
        .array(
          z.object({
            name: z.string().describe('CC role name')
          })
        )
        .optional()
        .describe('Defined CC roles')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        authMethod: ctx.auth.authMethod
      });

      let account = await client.getAccount();
      let previousCallbackUrl = account.callback_url || null;

      await client.updateAccount({ callbackUrl: ctx.input.webhookBaseUrl });

      return {
        registrationDetails: {
          previousCallbackUrl
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        authMethod: ctx.auth.authMethod
      });

      let previousUrl = ctx.input.registrationDetails?.previousCallbackUrl || '';
      await client.updateAccount({ callbackUrl: previousUrl });
    },

    handleRequest: async ctx => {
      let rawData: any;

      let contentType = ctx.request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        rawData = await ctx.request.json();
      } else {
        let text = await ctx.request.text();

        let jsonMatch = text.match(/name="json"\r?\n\r?\n([\s\S]*?)(?:\r?\n--|\s*$)/);
        if (jsonMatch?.[1]) {
          rawData = JSON.parse(jsonMatch[1].trim());
        } else {
          try {
            rawData = JSON.parse(text);
          } catch {
            return { inputs: [] };
          }
        }
      }

      let event = rawData?.event;
      if (!event) {
        return { inputs: [] };
      }

      let eventType = event.event_type;

      // Filter: only process template events
      if (!eventType?.startsWith('template_')) {
        return { inputs: [] };
      }

      let template = rawData.template;
      if (!template) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventTime: String(event.event_time),
            eventHash: event.event_hash,
            reportedForAccountId: event.event_metadata?.reported_for_account_id,
            template
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let t = ctx.input.template;

      let signerRoles = (t.signer_roles || []).map((r: any) => ({
        name: r.name,
        order: r.order
      }));

      let ccRoles = (t.cc_roles || []).map((r: any) => ({
        name: r.name
      }));

      return {
        type: ctx.input.eventType,
        id: `${t.template_id}_${ctx.input.eventType}_${ctx.input.eventTime}`,
        output: {
          templateId: t.template_id,
          title: t.title || undefined,
          message: t.message || undefined,
          signerRoles,
          ccRoles
        }
      };
    }
  })
  .build();
