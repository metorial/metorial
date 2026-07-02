import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let contractEvents = SlateTrigger.create(spec, {
  name: 'Contract Events',
  key: 'contract_events',
  description:
    'Triggered when contract lifecycle events occur: created, amended, status updated, terminated, or team member invited to sign.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type identifier'),
      eventId: z.string().describe('Unique identifier for this event'),
      contractId: z.string().optional().describe('ID of the affected contract'),
      payload: z.any().describe('Full event payload from Deel')
    })
  )
  .output(
    z.object({
      contractId: z.string().describe('ID of the affected contract'),
      contractTitle: z.string().optional().describe('Title of the contract'),
      contractStatus: z.string().optional().describe('Current status of the contract'),
      contractType: z.string().optional().describe('Type of the contract'),
      workerName: z.string().optional().describe('Name of the worker on this contract'),
      workerEmail: z.string().optional().describe('Email of the worker'),
      rawEvent: z.any().describe('Full raw event data from Deel')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let result = await client.createWebhook({
        name: 'Slates Contract Events',
        description: 'Auto-registered webhook for contract events',
        url: ctx.input.webhookBaseUrl,
        events: [
          'contract.created',
          'contract.amended',
          'contract.status_updated',
          'contract.terminated',
          'contract.archived',
          'contract.team_member_invited_to_sign'
        ]
      });

      let webhookData = result?.data ?? result;

      return {
        registrationDetails: {
          webhookId: webhookData?.id ?? webhookData?.webhook_id,
          secret: webhookData?.secret
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
      let data = (await ctx.request.json()) as any;

      let meta = data?.data?.meta ?? data?.meta ?? {};
      let resource = data?.data?.resource ?? data?.resource ?? {};

      let eventType = meta.event_type ?? data?.event_type ?? 'contract.unknown';
      let trackingId = meta.tracking_id ?? data?.id ?? `${eventType}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId: trackingId,
            contractId: resource?.id?.toString(),
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let resource = ctx.input.payload?.data?.resource ?? ctx.input.payload?.resource ?? {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          contractId: ctx.input.contractId ?? resource?.id?.toString() ?? '',
          contractTitle: resource?.title ?? resource?.job_title,
          contractStatus: resource?.status,
          contractType: resource?.type,
          workerName: resource?.contractor?.name ?? resource?.worker?.name,
          workerEmail: resource?.contractor?.email ?? resource?.worker?.email,
          rawEvent: ctx.input.payload
        }
      };
    }
  })
  .build();
