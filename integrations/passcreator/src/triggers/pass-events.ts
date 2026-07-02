import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let PASS_EVENT_TYPES = [
  'pass_created',
  'pass_updated',
  'pass_voided',
  'pushnotification_registered',
  'first_pushnotification_registered',
  'pushnotification_unregistered'
] as const;

export let passEvents = SlateTrigger.create(spec, {
  name: 'Pass Events',
  key: 'pass_events',
  description:
    'Triggers on pass lifecycle events: creation, updates, voiding, and device registration/unregistration of push notifications.'
})
  .input(
    z.object({
      eventType: z.enum(PASS_EVENT_TYPES).describe('Type of pass event'),
      passId: z.string().describe('Unique identifier of the pass'),
      uniqueIdentifier: z.string().describe('Unique identifier from the webhook payload'),
      createdOn: z.string().optional().describe('Timestamp of the event'),
      templateId: z.string().optional().describe('Template identifier the pass belongs to'),
      userProvidedId: z.string().optional().describe('User-provided ID of the pass'),
      linkToPassPage: z.string().optional().describe('URL to the pass download page'),
      operatingSystem: z
        .string()
        .optional()
        .describe('Operating system (for registration events)'),
      genericProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom pass field values'),
      activePasses: z.number().optional().describe('Number of active passes after this event'),
      inactivePasses: z
        .number()
        .optional()
        .describe('Number of inactive passes after this event')
    })
  )
  .output(
    z.object({
      passId: z.string().describe('Unique identifier of the pass'),
      templateId: z.string().optional().describe('Template identifier'),
      userProvidedId: z.string().optional().describe('User-provided ID'),
      createdOn: z.string().optional().describe('Event timestamp'),
      linkToPassPage: z.string().optional().describe('Pass download page URL'),
      operatingSystem: z.string().optional().describe('Device OS (for registration events)'),
      genericProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values'),
      activePasses: z.number().optional().describe('Active pass count'),
      inactivePasses: z.number().optional().describe('Inactive pass count')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let registeredUrls: Array<{ event: string; targetUrl: string }> = [];

      for (let event of PASS_EVENT_TYPES) {
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
      let eventType = pathParts[pathParts.length - 1] as (typeof PASS_EVENT_TYPES)[number];

      // Validate event type
      if (!PASS_EVENT_TYPES.includes(eventType)) {
        eventType = 'pass_updated';
      }

      return {
        inputs: [
          {
            eventType,
            passId: body.identifier || body.uniqueIdentifier || '',
            uniqueIdentifier: body.uniqueIdentifier || body.identifier || '',
            createdOn: body.createdOn,
            templateId: body.passTemplateGuid || body.passTemplate,
            userProvidedId: body.userProvidedId,
            linkToPassPage: body.linkToPassPage,
            operatingSystem: body.operatingSystem,
            genericProperties: body.genericProperties,
            activePasses: body.noOfActivePasses,
            inactivePasses: body.noOfInactivePasses
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `pass.${ctx.input.eventType}`,
        id: `${ctx.input.uniqueIdentifier}-${ctx.input.eventType}-${ctx.input.createdOn || Date.now()}`,
        output: {
          passId: ctx.input.passId,
          templateId: ctx.input.templateId,
          userProvidedId: ctx.input.userProvidedId,
          createdOn: ctx.input.createdOn,
          linkToPassPage: ctx.input.linkToPassPage,
          operatingSystem: ctx.input.operatingSystem,
          genericProperties: ctx.input.genericProperties,
          activePasses: ctx.input.activePasses,
          inactivePasses: ctx.input.inactivePasses
        }
      };
    }
  })
  .build();
