import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let proofEvents = SlateTrigger.create(spec, {
  name: 'Proof Events',
  key: 'proof_events',
  description: 'Triggers when a verifiable presentation (proof) is submitted by a holder.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of proof event'),
      webhookPayload: z.any().describe('Raw webhook payload from Truvera')
    })
  )
  .output(
    z.object({
      proofRequestId: z.string().optional().describe('ID of the proof request'),
      verified: z.boolean().optional().describe('Whether the proof was verified successfully'),
      holderDid: z.string().optional().describe('DID of the holder who submitted the proof'),
      proofData: z.any().optional().describe('Additional proof data from the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: ['proof_submitted'],
        description: 'Slates proof events webhook',
        status: 1
      });

      return {
        registrationDetails: {
          webhookId: result?.id,
          secret: result?.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: body.event || 'unknown',
            webhookPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.webhookPayload;
      let data = payload?.data || {};

      return {
        type: 'proof.submitted',
        id: data?.id || data?.proofRequestId || `proof_submitted-${Date.now()}`,
        output: {
          proofRequestId: data?.id || data?.proofRequestId,
          verified: data?.verified,
          holderDid: data?.holder || data?.holderDid,
          proofData: data
        }
      };
    }
  })
  .build();
