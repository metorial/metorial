import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import { spec } from '../spec';

let webhookTypes = ['offerCreate', 'offerUpdate', 'offerDelete'] as const;

export let offerEventsTrigger = SlateTrigger.create(spec, {
  name: 'Offer Events',
  key: 'offer_events',
  description: 'Triggers when an offer is created, updated, or deleted.'
})
  .input(
    z.object({
      webhookType: z.string().describe('The type of webhook event'),
      webhookActionId: z
        .string()
        .describe('Unique ID grouping related webhook events from the same action'),
      offerId: z.string().describe('The offer ID'),
      rawPayload: z.any().describe('The full webhook payload')
    })
  )
  .output(
    z.object({
      offerId: z.string().describe('The offer ID'),
      applicationId: z.string().optional().describe('The application ID'),
      candidateId: z.string().optional().describe('The candidate ID'),
      candidateName: z.string().optional().describe('The candidate name'),
      jobId: z.string().optional().describe('The job ID'),
      jobTitle: z.string().optional().describe('The job title'),
      offerStatus: z.string().optional().describe('The offer status')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AshbyClient({ token: ctx.auth.token });
      let secretToken = crypto.randomUUID();
      let registrations: Array<{ webhookId: string; webhookType: string }> = [];

      for (let webhookType of webhookTypes) {
        let response = await client.createWebhook({
          webhookType,
          requestUrl: ctx.input.webhookBaseUrl,
          secretToken
        });
        registrations.push({
          webhookId: response.results.id,
          webhookType
        });
      }

      return {
        registrationDetails: {
          webhookIds: registrations,
          secretToken
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new AshbyClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        webhookIds: Array<{ webhookId: string }>;
      };

      for (let registration of details.webhookIds) {
        await client.deleteWebhook(registration.webhookId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let offerId = data.data?.offer?.id || data.data?.offerId || '';

      return {
        inputs: [
          {
            webhookType: data.action || 'unknown',
            webhookActionId: data.webhookActionId || crypto.randomUUID(),
            offerId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload;
      let offerData = payload.data?.offer || {};

      let applicationId = offerData.applicationId || offerData.application?.id;
      let candidateId = offerData.candidate?.id || offerData.candidateId;
      let candidateName = offerData.candidate?.name;
      let jobId = offerData.job?.id;
      let jobTitle = offerData.job?.title;
      let offerStatus = offerData.status;

      if (ctx.input.webhookType !== 'offerDelete' && ctx.input.offerId) {
        try {
          let client = new AshbyClient({ token: ctx.auth.token });
          let offerInfo = await client.getOffer(ctx.input.offerId);
          let offer = offerInfo.results;
          applicationId = offer?.applicationId || applicationId;
          offerStatus = offer?.status || offerStatus;
        } catch {
          // Use data from the webhook payload
        }
      }

      let eventTypeMap: Record<string, string> = {
        offerCreate: 'offer.created',
        offerUpdate: 'offer.updated',
        offerDelete: 'offer.deleted'
      };

      return {
        type: eventTypeMap[ctx.input.webhookType] || `offer.${ctx.input.webhookType}`,
        id: ctx.input.webhookActionId,
        output: {
          offerId: ctx.input.offerId,
          applicationId,
          candidateId,
          candidateName,
          jobId,
          jobTitle,
          offerStatus
        }
      };
    }
  })
  .build();
