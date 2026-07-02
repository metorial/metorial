import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let getQrCode = SlateTool.create(spec, {
  name: 'Get QR Code',
  key: 'get_qr_code',
  description: `Retrieve detailed information about a specific QR code by its ID, including its campaign configuration, visual attributes, associated place, and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      qrCodeId: z.number().describe('ID of the QR code to retrieve')
    })
  )
  .output(
    z.object({
      qrCodeId: z.number().describe('Unique ID of the QR code'),
      name: z.string().describe('Name of the QR code'),
      qrType: z.number().describe('Type: 1=Static, 2=Dynamic'),
      organizationId: z.number().describe('Organization ID'),
      url: z.string().optional().describe('Short URL for the QR code'),
      campaign: z
        .object({
          campaignId: z.number().optional().describe('Campaign ID'),
          contentType: z
            .number()
            .optional()
            .describe('Campaign type: 0=None, 1=URL, 2=Landing Page, 3=Form'),
          customUrl: z.string().optional().describe('Custom URL if content type is URL'),
          active: z.boolean().optional().describe('Whether the campaign is active')
        })
        .optional()
        .describe('Associated campaign details'),
      attributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Visual design attributes'),
      fieldsData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Static QR code content fields'),
      placeId: z.number().optional().describe('Associated place ID'),
      locationEnabled: z.boolean().optional().describe('Whether location tracking is enabled'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconstacClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let qr = await client.getQrCode(ctx.input.qrCodeId);

    let campaign = qr.campaign
      ? {
          campaignId: qr.campaign.id,
          contentType: qr.campaign.content_type,
          customUrl: qr.campaign.custom_url,
          active: qr.campaign.campaign_active
        }
      : undefined;

    return {
      output: {
        qrCodeId: qr.id,
        name: qr.name,
        qrType: qr.qr_type,
        organizationId: qr.organization,
        url: qr.url,
        campaign,
        attributes: qr.attributes,
        fieldsData: qr.fields_data,
        placeId: qr.place,
        locationEnabled: qr.location_enabled,
        createdAt: qr.created,
        updatedAt: qr.updated
      },
      message: `Retrieved QR code **"${qr.name}"** (ID: ${qr.id}, ${qr.qr_type === 1 ? 'Static' : 'Dynamic'}).`
    };
  })
  .build();
