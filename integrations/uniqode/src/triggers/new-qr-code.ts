import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let newQrCode = SlateTrigger.create(spec, {
  name: 'New QR Code',
  key: 'new_qr_code',
  description: 'Triggers when a new QR code is created in your Beaconstac account.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      qrCodeId: z.number().describe('QR code ID'),
      name: z.string().describe('QR code name'),
      qrType: z.number().describe('QR code type: 1=Static, 2=Dynamic'),
      url: z.string().optional().describe('QR code short URL'),
      campaignContentType: z.number().optional().describe('Campaign content type'),
      organizationId: z.number().optional().describe('Organization ID'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      qrCodeId: z.number().describe('ID of the QR code'),
      name: z.string().describe('Name of the QR code'),
      qrType: z.number().describe('QR code type: 1=Static, 2=Dynamic'),
      url: z.string().optional().describe('QR code short URL'),
      campaignContentType: z.number().optional().describe('Campaign content type'),
      organizationId: z.number().optional().describe('Organization ID'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new BeaconstacClient({
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId
      });

      let result = await client.listQrCodes({
        ordering: '-created',
        organization: ctx.config.organizationId,
        limit: 20
      });

      let lastSeenId = (ctx.state as Record<string, unknown>)?.lastSeenId as
        | number
        | undefined;

      let newQrCodes = lastSeenId ? result.results.filter(qr => qr.id > lastSeenId) : [];

      let latestId = result.results.length > 0 ? result.results[0]!.id : lastSeenId;

      return {
        inputs: newQrCodes.map(qr => ({
          eventType: 'created',
          qrCodeId: qr.id,
          name: qr.name,
          qrType: qr.qr_type,
          url: qr.url,
          campaignContentType: qr.campaign?.content_type,
          organizationId: qr.organization,
          createdAt: qr.created
        })),
        updatedState: {
          lastSeenId: latestId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'qr_code.created',
        id: String(ctx.input.qrCodeId),
        output: {
          qrCodeId: ctx.input.qrCodeId,
          name: ctx.input.name,
          qrType: ctx.input.qrType,
          url: ctx.input.url,
          campaignContentType: ctx.input.campaignContentType,
          organizationId: ctx.input.organizationId,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
