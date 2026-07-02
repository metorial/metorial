import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let TEMPLATE_EVENT_TYPES = ['pass_template_created', 'pass_template_updated'] as const;

export let templateEvents = SlateTrigger.create(spec, {
  name: 'Template Events',
  key: 'template_events',
  description: 'Triggers when a pass template is created or updated.'
})
  .input(
    z.object({
      eventType: z.enum(TEMPLATE_EVENT_TYPES).describe('Type of template event'),
      templateId: z.string().describe('Unique identifier of the template'),
      name: z.string().optional().describe('Name of the template'),
      activePasses: z
        .number()
        .optional()
        .describe('Number of active passes using this template'),
      createdPasses: z
        .number()
        .optional()
        .describe('Total number of passes created from this template')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique identifier of the template'),
      name: z.string().optional().describe('Template name'),
      activePasses: z.number().optional().describe('Active pass count'),
      createdPasses: z.number().optional().describe('Total created pass count')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let registeredUrls: Array<{ event: string; targetUrl: string }> = [];

      for (let event of TEMPLATE_EVENT_TYPES) {
        let targetUrl = `${ctx.input.webhookBaseUrl}/${event}`;
        await client.subscribeWebhook(event, targetUrl, { retryEnabled: true });
        registeredUrls.push({ event, targetUrl });
      }

      return {
        registrationDetails: { registeredUrls }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        registeredUrls: Array<{ event: string; targetUrl: string }>;
      };

      for (let entry of details.registeredUrls) {
        try {
          await client.unsubscribeWebhook(entry.targetUrl);
        } catch {
          // Best effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let url = new URL(ctx.request.url);
      let pathParts = url.pathname.split('/');
      let eventType = pathParts[pathParts.length - 1] as (typeof TEMPLATE_EVENT_TYPES)[number];

      if (!TEMPLATE_EVENT_TYPES.includes(eventType)) {
        eventType = 'pass_template_updated';
      }

      return {
        inputs: [
          {
            eventType,
            templateId: body.uniqueIdentifier || '',
            name: body.name,
            activePasses: body.noOfActivePasses,
            createdPasses: body.noOfCreatedPasses
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `pass_template.${ctx.input.eventType === 'pass_template_created' ? 'created' : 'updated'}`,
        id: `${ctx.input.templateId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          templateId: ctx.input.templateId,
          name: ctx.input.name,
          activePasses: ctx.input.activePasses,
          createdPasses: ctx.input.createdPasses
        }
      };
    }
  })
  .build();
