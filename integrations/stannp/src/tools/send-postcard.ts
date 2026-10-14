import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

let recipientSchema = z
  .object({
    firstname: z.string().optional().describe('Recipient first name'),
    lastname: z.string().optional().describe('Recipient last name'),
    company: z.string().optional().describe('Recipient company name'),
    address1: z.string().describe('Primary address line'),
    address2: z.string().optional().describe('Secondary address line'),
    city: z.string().optional().describe('City'),
    state: z.string().optional().describe('State or county'),
    zipcode: z.string().optional().describe('Postal/zip code'),
    postcode: z.string().optional().describe('Postal code for UK/EU addresses'),
    country: z
      .string()
      .optional()
      .describe('ISO 3166-1 Alpha-2 country code (e.g. US, GB, CA)')
  })
  .describe('Inline recipient address details for a new recipient');

export let sendPostcard = SlateTool.create(spec, {
  name: 'Send Postcard',
  key: 'send_postcard',
  description: `Send a personalized postcard to a recipient. You can target an existing recipient by ID or provide inline address details. Supports custom front/back images, templates, and test mode for generating sample PDFs without dispatch.`,
  instructions: [
    'Provide either a recipientId for an existing recipient OR inline recipient details, not both.',
    'Set test to true to generate a sample PDF without actually sending or charging your account.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      size: z
        .enum(['4x6', '6x9', '6x11', 'A6', 'A5', 'A5-ENV', 'A5-PORT'])
        .describe('Postcard size. US: 4x6, 6x9, 6x11. UK/EU: A6, A5, A5-ENV, A5-PORT'),
      recipientId: z.number().optional().describe('Existing recipient ID to send to'),
      recipient: recipientSchema.optional(),
      front: z
        .string()
        .optional()
        .describe('URL or base64-encoded image for the postcard front (JPG/PDF)'),
      back: z
        .string()
        .optional()
        .describe('URL or base64-encoded image for the postcard back (JPG/PDF)'),
      message: z.string().optional().describe('Text message for the back of the postcard'),
      templateId: z
        .number()
        .optional()
        .describe('Pre-configured template ID to use instead of front/back images'),
      tags: z.string().optional().describe('Comma-separated tags for tracking and reporting'),
      addons: z.string().optional().describe('Addon codes (e.g. FIRST_CLASS)'),
      test: z
        .boolean()
        .optional()
        .describe('Generate a sample PDF without sending or charging'),
      postUnverified: z
        .boolean()
        .optional()
        .describe('Send even if address cannot be verified (defaults to true)')
    })
  )
  .output(
    z.object({
      mailpieceId: z.string().describe('ID of the created mailpiece'),
      pdfUrl: z.string().optional().describe('URL to the generated PDF'),
      status: z.string().optional().describe('Current status of the postcard'),
      cost: z.string().optional().describe('Cost of the postcard'),
      format: z.string().optional().describe('Postcard format/size'),
      created: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    if ((ctx.input.recipientId !== undefined) === (ctx.input.recipient !== undefined)) {
      throw createApiServiceError(
        'Provide either recipientId or inline recipient details, not both.'
      );
    }
    let recipientValue: number | Record<string, unknown>;
    if (ctx.input.recipientId !== undefined) {
      recipientValue = ctx.input.recipientId;
    } else if (ctx.input.recipient) {
      recipientValue = ctx.input.recipient;
    } else {
      throw createApiServiceError('Provide recipientId or inline recipient details.');
    }

    if (ctx.input.templateId === undefined && !ctx.input.front?.trim()) {
      throw createApiServiceError('Provide templateId or front artwork for the postcard.');
    }
    let result = await client.createPostcard({
      size: ctx.input.size,
      front: ctx.input.front,
      back: ctx.input.back,
      message: ctx.input.message,
      template: ctx.input.templateId,
      recipient: recipientValue,
      tags: ctx.input.tags,
      addons: ctx.input.addons,
      test: ctx.input.test,
      postUnverified: ctx.input.postUnverified
    });

    if (typeof result.pdf === 'string' && result.pdf) {
      await ctx.addAttachment({
        type: 'url',
        url: result.pdf,
        mimeType: 'application/pdf'
      });
    }
    return {
      output: {
        mailpieceId: String(result.id),
        pdfUrl: result.pdf ?? undefined,
        status: result.status ?? undefined,
        cost: result.cost != null ? String(result.cost) : undefined,
        format: result.format ?? undefined,
        created: result.created ?? undefined
      },
      message: ctx.input.test
        ? `Test postcard generated (${ctx.input.size}). The PDF is ready for download.`
        : `Postcard (${ctx.input.size}) created with ID **${result.id}**. Status: ${result.status}`
    };
  })
  .build();
