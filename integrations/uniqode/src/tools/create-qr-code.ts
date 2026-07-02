import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

let campaignSchema = z
  .object({
    contentType: z
      .number()
      .describe('Campaign type: 0=None, 1=Custom URL, 2=Landing Page, 3=Form, 4=Schedule'),
    customUrl: z.string().optional().describe('Target URL (required when contentType is 1)'),
    markdownCardId: z
      .number()
      .optional()
      .describe('Landing page ID (required when contentType is 2)'),
    formId: z.number().optional().describe('Form ID (required when contentType is 3)'),
    scheduleId: z.number().optional().describe('Schedule ID (required when contentType is 4)'),
    active: z.boolean().optional().describe('Whether the campaign is active')
  })
  .optional()
  .describe('Campaign configuration for dynamic QR codes');

let attributesSchema = z
  .object({
    color: z.string().optional().describe('QR code color, e.g. "#000000"'),
    gradientType: z.string().optional().describe('Gradient type for QR code styling'),
    margin: z.number().optional().describe('Margin around the QR code'),
    dataPattern: z.string().optional().describe('Data pattern style for the QR code modules'),
    eyeBallShape: z.string().optional().describe('Shape of the eye balls in the QR code'),
    eyeFrameShape: z.string().optional().describe('Shape of the eye frames in the QR code'),
    eyeBallColor: z.string().optional().describe('Color of the eye balls'),
    eyeFrameColor: z.string().optional().describe('Color of the eye frames'),
    logoImage: z.string().optional().describe('URL of logo image to embed in the QR code'),
    frameStyle: z.string().optional().describe('Frame style around the QR code'),
    backgroundColor: z.string().optional().describe('Background color of the QR code')
  })
  .optional()
  .describe('Visual design attributes for the QR code');

let fieldsDataSchema = z
  .object({
    qrType: z
      .string()
      .optional()
      .describe('Static QR type: "url", "phone", "sms", "text", "wifi", "email", "vcard"'),
    url: z.string().optional().describe('URL for static URL QR codes'),
    phone: z.string().optional().describe('Phone number for static phone QR codes'),
    sms: z.string().optional().describe('SMS body for static SMS QR codes'),
    text: z.string().optional().describe('Text content for static text QR codes'),
    email: z.string().optional().describe('Email address for static email QR codes')
  })
  .optional()
  .describe('Content fields for static QR codes');

export let createQrCode = SlateTool.create(spec, {
  name: 'Create QR Code',
  key: 'create_qr_code',
  description: `Create a new static or dynamic QR code. Dynamic QR codes support campaigns (URL redirect, landing page, form, etc.) and allow changing the destination after deployment. Static QR codes encode content directly and cannot be tracked or modified after creation.
Use **qrType 1** for static and **qrType 2** for dynamic. Customize the design with attributes like colors, patterns, and logos.`,
  instructions: [
    'For dynamic QR codes (qrType=2), provide a campaign object with the desired content type.',
    'For static QR codes (qrType=1), provide fieldsData with the content to encode.',
    'The organizationId from config is used automatically if not specified.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the QR code'),
      qrType: z.number().describe('QR code type: 1=Static, 2=Dynamic'),
      organizationId: z
        .number()
        .optional()
        .describe('Organization ID. Falls back to the configured organizationId.'),
      campaign: campaignSchema,
      fieldsData: fieldsDataSchema,
      attributes: attributesSchema,
      placeId: z.number().optional().describe('Place ID to associate with the QR code'),
      locationEnabled: z
        .boolean()
        .optional()
        .describe('Whether location tracking is enabled for scans')
    })
  )
  .output(
    z.object({
      qrCodeId: z.number().describe('Unique ID of the created QR code'),
      name: z.string().describe('Name of the QR code'),
      qrType: z.number().describe('Type of QR code: 1=Static, 2=Dynamic'),
      url: z.string().optional().describe('Short URL for the QR code'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconstacClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let orgId =
      ctx.input.organizationId ??
      (ctx.config.organizationId ? Number(ctx.config.organizationId) : undefined);

    let campaignData: Record<string, unknown> | undefined;
    if (ctx.input.campaign) {
      campaignData = {
        content_type: ctx.input.campaign.contentType
      };
      if (ctx.input.campaign.customUrl !== undefined)
        campaignData.custom_url = ctx.input.campaign.customUrl;
      if (ctx.input.campaign.markdownCardId !== undefined)
        campaignData.markdown_card = ctx.input.campaign.markdownCardId;
      if (ctx.input.campaign.formId !== undefined)
        campaignData.form = ctx.input.campaign.formId;
      if (ctx.input.campaign.scheduleId !== undefined)
        campaignData.schedule = ctx.input.campaign.scheduleId;
      if (ctx.input.campaign.active !== undefined)
        campaignData.campaign_active = ctx.input.campaign.active;
    }

    let attributesData: Record<string, unknown> | undefined;
    if (ctx.input.attributes) {
      attributesData = {};
      let a = ctx.input.attributes;
      if (a.color !== undefined) attributesData.color = a.color;
      if (a.gradientType !== undefined) attributesData.gradientType = a.gradientType;
      if (a.margin !== undefined) attributesData.margin = a.margin;
      if (a.dataPattern !== undefined) attributesData.dataPattern = a.dataPattern;
      if (a.eyeBallShape !== undefined) attributesData.eyeBallShape = a.eyeBallShape;
      if (a.eyeFrameShape !== undefined) attributesData.eyeFrameShape = a.eyeFrameShape;
      if (a.eyeBallColor !== undefined) attributesData.eyeBallColor = a.eyeBallColor;
      if (a.eyeFrameColor !== undefined) attributesData.eyeFrameColor = a.eyeFrameColor;
      if (a.logoImage !== undefined) attributesData.logoImage = a.logoImage;
      if (a.frameStyle !== undefined) attributesData.frameStyle = a.frameStyle;
      if (a.backgroundColor !== undefined) attributesData.backgroundColor = a.backgroundColor;
    }

    let fieldsData: Record<string, unknown> | undefined;
    if (ctx.input.fieldsData) {
      fieldsData = {};
      let f = ctx.input.fieldsData;
      if (f.qrType !== undefined) fieldsData.qr_type = f.qrType;
      if (f.url !== undefined) fieldsData.url = f.url;
      if (f.phone !== undefined) fieldsData.phone = f.phone;
      if (f.sms !== undefined) fieldsData.sms = f.sms;
      if (f.text !== undefined) fieldsData.text = f.text;
      if (f.email !== undefined) fieldsData.email = f.email;
    }

    let result = await client.createQrCode({
      name: ctx.input.name,
      organization: orgId!,
      qr_type: ctx.input.qrType,
      campaign: campaignData,
      fields_data: fieldsData,
      attributes: attributesData,
      place: ctx.input.placeId,
      location_enabled: ctx.input.locationEnabled
    });

    return {
      output: {
        qrCodeId: result.id,
        name: result.name,
        qrType: result.qr_type,
        url: result.url,
        createdAt: result.created
      },
      message: `Created ${ctx.input.qrType === 1 ? 'static' : 'dynamic'} QR code **"${result.name}"** (ID: ${result.id}).`
    };
  })
  .build();
