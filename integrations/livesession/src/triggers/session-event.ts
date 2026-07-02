import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let visitorSchema = z
  .object({
    visitorId: z.string().optional().describe('Unique visitor identifier'),
    name: z.string().optional().describe('Visitor name'),
    email: z.string().optional().describe('Visitor email'),
    params: z.record(z.string(), z.unknown()).optional().describe('Custom visitor parameters'),
    geolocation: z
      .object({
        countryCode: z.string().optional().describe('Two-letter country code'),
        city: z.string().optional().describe('City name'),
        region: z.string().optional().describe('Region/state code')
      })
      .optional()
      .describe('Visitor geolocation data')
  })
  .describe('Visitor who triggered the event');

let mapVisitor = (v: any) => {
  if (!v) return undefined;
  return {
    visitorId: v.id,
    name: v.name,
    email: v.email,
    params: v.params,
    geolocation: v.geolocation
      ? {
          countryCode: v.geolocation.country_code,
          city: v.geolocation.city,
          region: v.geolocation.region
        }
      : undefined
  };
};

export let sessionEvent = SlateTrigger.create(spec, {
  name: 'Session Event',
  key: 'session_event',
  description:
    'Triggers when a session event occurs, including JavaScript errors, network errors, error clicks, rage clicks, and custom events.'
})
  .input(
    z.object({
      messageId: z.string().describe('Unique message identifier'),
      webhookId: z.string().describe('Webhook configuration ID'),
      accountId: z.string().optional().describe('LiveSession account ID'),
      websiteId: z.string().optional().describe('Website ID'),
      apiVersion: z.string().optional().describe('API version'),
      createdAt: z.number().optional().describe('Event creation timestamp (Unix epoch)'),
      eventName: z
        .string()
        .describe('Event sub-type: JSError, NetError, ErrorClick, RageClick, or Custom'),
      payload: z.record(z.string(), z.unknown()).describe('Raw event payload')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique webhook message identifier'),
      webhookId: z.string().describe('Webhook configuration ID that delivered this event'),
      accountId: z.string().optional().describe('LiveSession account ID'),
      websiteId: z.string().optional().describe('Associated website ID'),
      eventName: z
        .string()
        .describe('Event type: JSError, NetError, ErrorClick, RageClick, or Custom'),
      timestamp: z.string().optional().describe('Timestamp of the event'),

      // JSError fields
      errorMessage: z
        .string()
        .optional()
        .describe('JavaScript error message (JSError events)'),
      errorCount: z.number().optional().describe('Error occurrence count (JSError events)'),

      // NetError fields
      httpMethod: z
        .string()
        .optional()
        .describe('HTTP method of the failed request (NetError events)'),
      requestUrl: z
        .string()
        .optional()
        .describe('URL of the failed network request (NetError events)'),
      statusCode: z.number().optional().describe('HTTP status code (NetError events)'),

      // ErrorClick fields
      clickErrorMessage: z
        .string()
        .optional()
        .describe('Error click message (ErrorClick events)'),

      // RageClick fields
      clickCount: z.number().optional().describe('Number of rapid clicks (RageClick events)'),

      // Custom fields
      customEventName: z.string().optional().describe('Custom event name (Custom events)'),
      customProperties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom event properties with typed values (Custom events)'),

      visitor: visitorSchema.optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(ctx.auth.token);

      // Fetch websites to find a valid website ID for webhook registration
      let websites = await client.listWebsites();
      let websiteList = Array.isArray(websites) ? websites : websites.websites || [];

      if (websiteList.length === 0) {
        throw new Error(
          'No websites found in the LiveSession account. A website is required to register a webhook.'
        );
      }

      let websiteId = websiteList[0].website_id || websiteList[0].id;

      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        websiteId
      });

      return {
        registrationDetails: {
          webhookId: result.webhook_id || result.id,
          websiteId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let payload = body.payload || {};
      let eventName = payload.event_name || 'Unknown';

      return {
        inputs: [
          {
            messageId: body.message_id || '',
            webhookId: body.webhook_id || '',
            accountId: body.account_id,
            websiteId: body.website_id,
            apiVersion: body.api_version,
            createdAt: body.created_at,
            eventName,
            payload
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { payload, eventName } = ctx.input;
      let p = payload as any;
      let visitor = mapVisitor(p.visitor);

      let output: any = {
        messageId: ctx.input.messageId,
        webhookId: ctx.input.webhookId,
        accountId: ctx.input.accountId,
        websiteId: ctx.input.websiteId,
        eventName,
        timestamp: p.time,
        visitor
      };

      switch (eventName) {
        case 'JSError':
          output.errorMessage = p.value;
          output.errorCount = p.count;
          break;
        case 'NetError':
          output.httpMethod = p.method;
          output.requestUrl = p.url;
          output.statusCode = p.status;
          break;
        case 'ErrorClick':
          output.clickErrorMessage = p.messsage || p.message;
          break;
        case 'RageClick':
          output.clickCount = p.clicks;
          break;
        case 'Custom':
          output.customEventName = p.name;
          output.customProperties = p.properties;
          break;
      }

      return {
        type: `session.${eventName.toLowerCase()}`,
        id: ctx.input.messageId,
        output
      };
    }
  })
  .build();
