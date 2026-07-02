import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let updateQrCode = SlateTool.create(spec, {
  name: 'Update QR Code',
  key: 'update_qr_code',
  description: `Update an existing dynamic QR code's name, campaign, visual attributes, or place association. Dynamic QR codes can have their destination or campaign changed after deployment without regenerating the code.`,
  instructions: [
    'Only dynamic QR codes (qrType=2) can be meaningfully updated with campaign changes.',
    'Provide only the fields you want to change; unset fields will not be modified.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      qrCodeId: z.number().describe('ID of the QR code to update'),
      name: z.string().optional().describe('New name for the QR code'),
      campaign: z
        .object({
          contentType: z
            .number()
            .optional()
            .describe('Campaign type: 0=None, 1=Custom URL, 2=Landing Page, 3=Form'),
          customUrl: z.string().optional().describe('Target URL (for contentType 1)'),
          markdownCardId: z
            .number()
            .optional()
            .describe('Landing page ID (for contentType 2)'),
          formId: z.number().optional().describe('Form ID (for contentType 3)'),
          active: z.boolean().optional().describe('Whether the campaign is active')
        })
        .optional()
        .describe('Updated campaign configuration'),
      attributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated visual design attributes (color, logo, pattern, etc.)'),
      placeId: z.number().optional().describe('New place ID to associate with'),
      locationEnabled: z.boolean().optional().describe('Enable or disable location tracking')
    })
  )
  .output(
    z.object({
      qrCodeId: z.number().describe('ID of the updated QR code'),
      name: z.string().describe('Updated name'),
      qrType: z.number().describe('QR code type'),
      url: z.string().optional().describe('QR code short URL'),
      updatedAt: z.string().optional().describe('Update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconstacClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let data: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.placeId !== undefined) data.place = ctx.input.placeId;
    if (ctx.input.locationEnabled !== undefined)
      data.location_enabled = ctx.input.locationEnabled;
    if (ctx.input.attributes !== undefined) data.attributes = ctx.input.attributes;

    if (ctx.input.campaign) {
      let campaignData: Record<string, unknown> = {};
      if (ctx.input.campaign.contentType !== undefined)
        campaignData.content_type = ctx.input.campaign.contentType;
      if (ctx.input.campaign.customUrl !== undefined)
        campaignData.custom_url = ctx.input.campaign.customUrl;
      if (ctx.input.campaign.markdownCardId !== undefined)
        campaignData.markdown_card = ctx.input.campaign.markdownCardId;
      if (ctx.input.campaign.formId !== undefined)
        campaignData.form = ctx.input.campaign.formId;
      if (ctx.input.campaign.active !== undefined)
        campaignData.campaign_active = ctx.input.campaign.active;
      data.campaign = campaignData;
    }

    let result = await client.updateQrCode(ctx.input.qrCodeId, data);

    return {
      output: {
        qrCodeId: result.id,
        name: result.name,
        qrType: result.qr_type,
        url: result.url,
        updatedAt: result.updated
      },
      message: `Updated QR code **"${result.name}"** (ID: ${result.id}).`
    };
  })
  .build();
