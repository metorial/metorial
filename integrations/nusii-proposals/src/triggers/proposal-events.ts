import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let PROPOSAL_EVENTS = [
  'proposal_created',
  'proposal_updated',
  'proposal_destroyed',
  'proposal_accepted',
  'proposal_rejected',
  'proposal_sent',
  'proposal_activity_client_viewed_proposal'
] as const;

export let proposalEvents = SlateTrigger.create(spec, {
  name: 'Proposal Events',
  key: 'proposal_events',
  description:
    'Triggers when a proposal is created, updated, deleted, accepted, rejected, sent, or viewed by a client.'
})
  .input(
    z.object({
      eventName: z.string().describe('The webhook event name'),
      proposalId: z.string().describe('The proposal ID from the event'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      proposalId: z.string(),
      title: z.string(),
      accountId: z.number(),
      status: z.string(),
      publicId: z.string(),
      preparedById: z.number().nullable(),
      clientId: z.number().nullable(),
      senderId: z.number().nullable(),
      currency: z.string(),
      archivedAt: z.string().nullable(),
      sectionIds: z.array(z.string())
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhookEndpoint(ctx.input.webhookBaseUrl, [
        ...PROPOSAL_EVENTS
      ]);

      return {
        registrationDetails: {
          webhookEndpointId: webhook.webhookEndpointId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhookEndpoint(ctx.input.registrationDetails.webhookEndpointId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventName = body.event || '';
      let proposalData = body.data || body.proposal || body;

      let proposalId = String(proposalData?.id || proposalData?.data?.id || '');

      return {
        inputs: [
          {
            eventName,
            proposalId,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventName = ctx.input.eventName;
      let payload = ctx.input.rawPayload;

      // Try to extract proposal data from the webhook payload
      let data = payload?.data || payload?.proposal || payload;
      let attrs = data?.attributes || data || {};

      let sectionIds: string[] = [];
      let relationships = data?.relationships?.sections?.data;
      if (Array.isArray(relationships)) {
        sectionIds = relationships.map((s: any) => String(s.id));
      }

      // Map the event name to our type format
      let typeMap: Record<string, string> = {
        proposal_created: 'proposal.created',
        proposal_updated: 'proposal.updated',
        proposal_destroyed: 'proposal.destroyed',
        proposal_accepted: 'proposal.accepted',
        proposal_rejected: 'proposal.rejected',
        proposal_sent: 'proposal.sent',
        proposal_activity_client_viewed_proposal: 'proposal.client_viewed'
      };

      let type = typeMap[eventName] || `proposal.${eventName}`;

      return {
        type,
        id: `${eventName}_${ctx.input.proposalId}_${Date.now()}`,
        output: {
          proposalId: ctx.input.proposalId || String(data?.id || ''),
          title: attrs.title || '',
          accountId: attrs.account_id ?? 0,
          status: attrs.status || '',
          publicId: attrs.public_id || '',
          preparedById: attrs.prepared_by_id ?? null,
          clientId: attrs.client_id ?? null,
          senderId: attrs.sender_id ?? null,
          currency: attrs.currency || '',
          archivedAt: attrs.archived_at ?? null,
          sectionIds
        }
      };
    }
  })
  .build();
