import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let callPartySchema = z.object({
  speakerId: z.string().optional(),
  name: z.string().optional(),
  emailAddress: z.string().optional(),
  title: z.string().optional(),
  affiliation: z.string().optional()
});

export let callEvent = SlateTrigger.create(spec, {
  name: 'Call Event',
  key: 'call_event',
  description:
    'Triggered when a Gong call matches an automation rule configured in Gong settings. Receives call data including metadata, participants, and content details. Configure webhook rules in Gong under Automation Rules.'
})
  .input(
    z.object({
      callId: z.string().describe('ID of the call'),
      isTest: z.boolean().optional().describe('Whether this is a test webhook'),
      callData: z.any().describe('Raw call data from the webhook payload')
    })
  )
  .output(
    z.object({
      callId: z.string().describe('Unique call identifier'),
      title: z.string().optional().describe('Call title'),
      started: z.string().optional().describe('ISO 8601 start time'),
      duration: z.number().optional().describe('Duration in seconds'),
      direction: z.string().optional().describe('Inbound or Outbound'),
      scope: z.string().optional().describe('Internal or External'),
      url: z.string().optional().describe('URL to the call in Gong'),
      parties: z.array(callPartySchema).optional().describe('Call participants'),
      topics: z.array(z.any()).optional().describe('Topics discussed'),
      trackers: z.array(z.any()).optional().describe('Tracker matches'),
      isTest: z.boolean().optional().describe('Whether this was a test webhook')
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

      // Gong webhook payload contains call data and isTest flag
      // The call data structure mirrors the API response
      let callData = data.call || data.callData || data;
      let isTest = data.isTest ?? false;

      let callId =
        callData?.metaData?.id || callData?.id || callData?.callId || `webhook-${Date.now()}`;

      return {
        inputs: [
          {
            callId,
            isTest,
            callData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let call = ctx.input.callData;
      let metaData = call?.metaData || call || {};

      return {
        type: 'call.processed',
        id: ctx.input.callId,
        output: {
          callId: ctx.input.callId,
          title: metaData.title,
          started: metaData.started,
          duration: metaData.duration,
          direction: metaData.direction,
          scope: metaData.scope,
          url: metaData.url,
          parties: call?.parties,
          topics: call?.content?.topics,
          trackers: call?.content?.trackers,
          isTest: ctx.input.isTest
        }
      };
    }
  })
  .build();
