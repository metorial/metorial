import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { WaiverFileClient } from '../lib/client';
import { spec } from '../spec';

export let waiverTrigger = SlateTrigger.create(spec, {
  name: 'Waiver Events',
  key: 'waiver_events',
  description:
    'Triggers when a waiver is signed or edited in WaiverFile. Covers both new waivers and edits to existing waivers.'
})
  .input(
    z.object({
      eventType: z.enum(['newwaiver', 'editwaiver']).describe('Type of waiver event'),
      payload: z.any().describe('Raw webhook payload from WaiverFile')
    })
  )
  .output(
    z.object({
      waiverId: z.string().describe('ID of the waiver'),
      signerFirstName: z.string().optional().describe('First name of the signer'),
      signerLastName: z.string().optional().describe('Last name of the signer'),
      signerEmail: z.string().optional().describe('Email address of the signer'),
      waiverFormName: z.string().optional().describe('Name of the waiver form used'),
      signedDate: z.string().optional().describe('Date and time the waiver was signed'),
      referenceId1: z.string().optional().describe('First reference ID linked to this waiver'),
      referenceId2: z
        .string()
        .optional()
        .describe('Second reference ID linked to this waiver'),
      referenceId3: z.string().optional().describe('Third reference ID linked to this waiver'),
      eventName: z.string().optional().describe('Name of the associated event, if any'),
      rawPayload: z.any().describe('Complete raw webhook payload')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new WaiverFileClient({
        token: ctx.auth.token,
        siteId: ctx.auth.siteId
      });

      let newWaiverUrl = `${ctx.input.webhookBaseUrl}/newwaiver`;
      let editWaiverUrl = `${ctx.input.webhookBaseUrl}/editwaiver`;

      await client.subscribeWebhook('newwaiver', newWaiverUrl);
      await client.subscribeWebhook('editwaiver', editWaiverUrl);

      return {
        registrationDetails: {
          newWaiverUrl,
          editWaiverUrl
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WaiverFileClient({
        token: ctx.auth.token,
        siteId: ctx.auth.siteId
      });

      await client.deleteWebhookSubscription('newwaiver');
      await client.deleteWebhookSubscription('editwaiver');
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let url = new URL(ctx.request.url);
      let pathSegments = url.pathname.split('/');
      let lastSegment = pathSegments[pathSegments.length - 1];

      let eventType: 'newwaiver' | 'editwaiver' =
        lastSegment === 'editwaiver' ? 'editwaiver' : 'newwaiver';

      return {
        inputs: [
          {
            eventType,
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { payload, eventType } = ctx.input;
      let waiverId = payload?.WaiverID ?? payload?.waiverId ?? String(Date.now());

      return {
        type: eventType === 'newwaiver' ? 'waiver.signed' : 'waiver.edited',
        id: `${waiverId}-${eventType}-${Date.now()}`,
        output: {
          waiverId: String(waiverId),
          signerFirstName: payload?.FirstName ?? payload?.firstName ?? undefined,
          signerLastName: payload?.LastName ?? payload?.lastName ?? undefined,
          signerEmail: payload?.Email ?? payload?.email ?? undefined,
          waiverFormName: payload?.WaiverFormName ?? payload?.waiverFormName ?? undefined,
          signedDate: payload?.SignedDate ?? payload?.signedDate ?? undefined,
          referenceId1: payload?.RefID1 ?? payload?.refID1 ?? undefined,
          referenceId2: payload?.RefID2 ?? payload?.refID2 ?? undefined,
          referenceId3: payload?.RefID3 ?? payload?.refID3 ?? undefined,
          eventName: payload?.EventName ?? payload?.eventName ?? undefined,
          rawPayload: payload
        }
      };
    }
  })
  .build();
