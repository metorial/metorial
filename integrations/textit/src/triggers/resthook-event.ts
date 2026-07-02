import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let resthookEvent = SlateTrigger.create(spec, {
  name: 'Resthook Event',
  key: 'resthook_event',
  description:
    'Triggered when a contact reaches a "Call Resthook" action in a flow. Resthook slugs must be configured within a flow in the TextIt UI before subscribing. Each event includes flow, contact, channel, run, input, and path data.'
})
  .input(
    z.object({
      resthookSlug: z.string().describe('The resthook slug identifier'),
      eventData: z.record(z.string(), z.any()).describe('Full event payload from the resthook')
    })
  )
  .output(
    z.object({
      resthookSlug: z.string().describe('The resthook slug that was triggered'),
      flowUuid: z.string().describe('UUID of the flow that triggered the event'),
      flowName: z.string().describe('Name of the flow'),
      contactUuid: z.string().describe('UUID of the contact'),
      contactName: z.string().describe('Name of the contact'),
      contactUrn: z.string().describe('URN of the contact'),
      channelUuid: z.string().nullable().describe('UUID of the channel'),
      channelName: z.string().nullable().describe('Name of the channel'),
      runUuid: z.string().describe('UUID of the flow run'),
      inputText: z.string().describe('Text input from the contact'),
      inputUrn: z.string().describe('URN of the input'),
      inputAttachments: z.array(z.string()).describe('Attachments from the input'),
      results: z.record(z.string(), z.any()).describe('Results captured in the flow')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(ctx.auth.token);

      // List available resthooks to find which ones to subscribe to
      let resthooksResult = await client.listResthooks();
      let subscribers: Array<{ subscriberId: number; resthookSlug: string }> = [];

      // Subscribe our webhook URL to all available resthooks
      for (let resthook of resthooksResult.results) {
        let subscriber = await client.createResthookSubscriber({
          resthook: resthook.resthook,
          target_url: ctx.input.webhookBaseUrl
        });
        subscribers.push({
          subscriberId: subscriber.id,
          resthookSlug: resthook.resthook
        });
      }

      return {
        registrationDetails: { subscribers }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(ctx.auth.token);
      let details = ctx.input.registrationDetails as {
        subscribers: Array<{ subscriberId: number; resthookSlug: string }>;
      };

      for (let sub of details.subscribers) {
        try {
          await client.deleteResthookSubscriber(sub.subscriberId);
        } catch {
          // Subscriber may already be removed
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      // Resthook events are POSTed directly with the event data
      let resthookSlug = (data.resthook as string) || 'unknown';

      return {
        inputs: [
          {
            resthookSlug,
            eventData: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventData = ctx.input.eventData;

      let flow = eventData.flow || {};
      let contact = eventData.contact || {};
      let channel = eventData.channel || {};
      let run = eventData.run || {};
      let input = eventData.input || {};
      let results = eventData.results || {};

      return {
        type: `resthook.${ctx.input.resthookSlug}`,
        id: run.uuid || `${ctx.input.resthookSlug}-${Date.now()}`,
        output: {
          resthookSlug: ctx.input.resthookSlug,
          flowUuid: flow.uuid || '',
          flowName: flow.name || '',
          contactUuid: contact.uuid || '',
          contactName: contact.name || '',
          contactUrn: contact.urn || '',
          channelUuid: channel.uuid || null,
          channelName: channel.name || null,
          runUuid: run.uuid || '',
          inputText: input.text || '',
          inputUrn: input.urn || '',
          inputAttachments: input.attachments || [],
          results
        }
      };
    }
  })
  .build();
