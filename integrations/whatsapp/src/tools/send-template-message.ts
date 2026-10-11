import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

type TemplateMediaSource = {
  link?: string;
  mediaId?: string;
  filename?: string;
};

let hasExactlyOneMediaSource = (value: { link?: string; mediaId?: string }) => {
  let hasLink = typeof value.link === 'string' && value.link.length > 0;
  let hasMediaId = typeof value.mediaId === 'string' && value.mediaId.length > 0;
  return hasLink !== hasMediaId;
};

let templateMediaSourceFields = {
  link: z.string().min(1).optional().describe('Public URL of the media file'),
  mediaId: z
    .string()
    .min(1)
    .optional()
    .describe('WhatsApp media ID of a previously uploaded file')
};

let templateMediaSourceSchema = z
  .object(templateMediaSourceFields)
  .refine(hasExactlyOneMediaSource, {
    message: 'Provide exactly one of link or mediaId'
  });

let templateDocumentSourceSchema = z
  .object({
    ...templateMediaSourceFields,
    filename: z.string().optional().describe('Document filename')
  })
  .refine(hasExactlyOneMediaSource, {
    message: 'Provide exactly one of link or mediaId'
  });

let mapTemplateMediaSource = (source: TemplateMediaSource, field: string) => {
  let hasLink = typeof source.link === 'string' && source.link.length > 0;
  let hasMediaId = typeof source.mediaId === 'string' && source.mediaId.length > 0;

  if (hasLink === hasMediaId) {
    throw createApiServiceError(
      `Provide exactly one of link or mediaId for template ${field}.`
    );
  }

  let mapped: Record<string, any> = {};
  if (hasLink) {
    mapped.link = source.link;
  } else {
    mapped.id = source.mediaId;
  }
  if (source.filename) mapped.filename = source.filename;

  return mapped;
};

// Named and positional parameters: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview
// Location headers: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/components
// Copy code buttons: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/coupon-templates
let templateParameterSchema = z.object({
  type: z
    .enum([
      'text',
      'image',
      'video',
      'document',
      'currency',
      'date_time',
      'payload',
      'location',
      'coupon_code'
    ])
    .describe('Parameter type'),
  parameterName: z
    .string()
    .optional()
    .describe(
      'Variable name for templates that use named parameters (e.g. "first_name" for {{first_name}}). Omit for positional templates.'
    ),
  text: z.string().optional().describe('Text value (for type "text" or button URL suffix)'),
  image: z
    .object(templateMediaSourceFields)
    .refine(hasExactlyOneMediaSource, {
      message: 'Provide exactly one of link or mediaId'
    })
    .optional()
    .describe('Image source (for type "image")'),
  video: templateMediaSourceSchema.optional().describe('Video source (for type "video")'),
  document: templateDocumentSourceSchema
    .optional()
    .describe('Document source (for type "document")'),
  currency: z
    .object({
      fallbackValue: z.string(),
      code: z.string(),
      amount1000: z.number()
    })
    .optional()
    .describe('Currency value (for type "currency")'),
  dateTime: z
    .object({
      fallbackValue: z.string()
    })
    .optional()
    .describe('Date/time value (for type "date_time")'),
  payload: z.string().optional().describe('Payload value (for button type "payload")'),
  location: z
    .object({
      latitude: z.number().describe('Latitude coordinate'),
      longitude: z.number().describe('Longitude coordinate'),
      name: z.string().optional().describe('Location name'),
      address: z.string().optional().describe('Location address')
    })
    .optional()
    .describe('Location value (for type "location" in a location header)'),
  couponCode: z
    .string()
    .max(20)
    .optional()
    .describe('Coupon code (for type "coupon_code" in a copy code button, max 20 characters)')
});

let templateComponentSchema = z.object({
  type: z.enum(['header', 'body', 'button']).describe('Component type'),
  subType: z
    .enum(['quick_reply', 'url', 'copy_code'])
    .optional()
    .describe('Button sub-type (required for button components)'),
  index: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Button index (required for button components, 0-based)'),
  parameters: z.array(templateParameterSchema).describe('Component parameters')
});

export let sendTemplateMessage = SlateTool.create(spec, {
  name: 'Send Template Message',
  key: 'send_template_message',
  description: `Send a pre-approved WhatsApp message template to a recipient. Templates can be sent **outside the 24-hour messaging window** and are required for business-initiated conversations.
Templates must be created and approved in the Meta dashboard before use. Use the List Templates tool to find available templates.`,
  instructions: [
    'The template name and language code must exactly match an approved template',
    'For positional templates ({{1}}, {{2}}), provide parameters in the order defined in the template. For named templates ({{first_name}}), set parameterName on each parameter',
    'For media headers, provide either a link or mediaId in the header component parameters',
    'Button components require a subType and index (0-based)'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: z.string().describe('Recipient phone number with country code'),
      templateName: z.string().describe('Name of the approved message template'),
      languageCode: z
        .string()
        .describe('Language code of the template (e.g. en_US, es, pt_BR)'),
      components: z
        .array(templateComponentSchema)
        .optional()
        .describe('Template components with dynamic parameter values')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the sent message'),
      recipientPhone: z.string().optional().describe('Recipient phone number'),
      recipientWaId: z.string().optional().describe('Recipient WhatsApp ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      phoneNumberId: ctx.config.phoneNumberId,
      wabaId: ctx.config.wabaId,
      apiVersion: ctx.config.apiVersion
    });

    let apiComponents = ctx.input.components?.map(comp => {
      let mapped: Record<string, any> = {
        type: comp.type,
        parameters: comp.parameters.map(param => {
          let p: Record<string, any> = { type: param.type };
          if (param.parameterName) p.parameter_name = param.parameterName;
          if (param.text !== undefined) p.text = param.text;
          if (param.location) {
            // Meta's location header example sends coordinates as strings.
            p.location = {
              latitude: String(param.location.latitude),
              longitude: String(param.location.longitude),
              ...(param.location.name ? { name: param.location.name } : {}),
              ...(param.location.address ? { address: param.location.address } : {})
            };
          }
          if (param.couponCode !== undefined) p.coupon_code = param.couponCode;
          if (param.payload !== undefined) p.payload = param.payload;
          if (param.image) {
            p.image = mapTemplateMediaSource(param.image, 'image parameter');
          }
          if (param.video) {
            p.video = mapTemplateMediaSource(param.video, 'video parameter');
          }
          if (param.document) {
            p.document = mapTemplateMediaSource(param.document, 'document parameter');
          }
          if (param.currency) {
            p.currency = {
              fallback_value: param.currency.fallbackValue,
              code: param.currency.code,
              amount_1000: param.currency.amount1000
            };
          }
          if (param.dateTime) {
            p.date_time = {
              fallback_value: param.dateTime.fallbackValue
            };
          }
          return p;
        })
      };
      if (comp.subType) mapped.sub_type = comp.subType;
      if (comp.index !== undefined) mapped.index = String(comp.index);
      return mapped;
    });

    let result = await client.sendTemplateMessage(ctx.input.to, {
      name: ctx.input.templateName,
      languageCode: ctx.input.languageCode,
      components: apiComponents
    });

    let messageId = result?.messages?.[0]?.id ?? '';
    let contact = result?.contacts?.[0];

    return {
      output: {
        messageId,
        recipientPhone: contact?.input,
        recipientWaId: contact?.wa_id
      },
      message: `Sent template **${ctx.input.templateName}** (${ctx.input.languageCode}) to ${ctx.input.to}. Message ID: \`${messageId}\``
    };
  })
  .build();
