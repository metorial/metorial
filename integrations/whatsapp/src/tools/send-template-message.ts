import { SlateTool } from 'slates';
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
    throw new Error(`Provide exactly one of link or mediaId for template ${field}.`);
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

let templateParameterSchema = z.object({
  type: z
    .enum(['text', 'image', 'video', 'document', 'currency', 'date_time', 'payload'])
    .describe('Parameter type'),
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
  payload: z.string().optional().describe('Payload value (for button type "payload")')
});

let templateComponentSchema = z.object({
  type: z.enum(['header', 'body', 'button']).describe('Component type'),
  subType: z
    .enum(['quick_reply', 'url'])
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
    'Template parameters are positional - provide them in the order defined in the template',
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
          if (param.text !== undefined) p.text = param.text;
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
