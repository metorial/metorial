import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrintMailClient } from '../lib/client';
import { spec } from '../spec';

let inlineAddressSchema = z
  .object({
    firstName: z.string().optional().describe('First name'),
    lastName: z.string().optional().describe('Last name'),
    companyName: z.string().optional().describe('Company name'),
    addressLine1: z.string().describe('Primary address line'),
    addressLine2: z.string().optional().describe('Secondary address line'),
    city: z.string().optional().describe('City'),
    provinceOrState: z.string().optional().describe('Province or state'),
    postalOrZip: z.string().optional().describe('Postal or ZIP code'),
    country: z.string().optional().describe('Two-letter country code')
  })
  .describe('Inline address object');

export let sendPostcard = SlateTool.create(spec, {
  name: 'Send Postcard',
  key: 'send_postcard',
  description: `Send a physical postcard through PostGrid. Provide front and back content as template IDs, HTML, or a 2-page PDF URL. Supports sizes 6x4, 9x6, and 11x6.`,
  instructions: [
    'Provide content as front/back template IDs, front/back HTML, or a single 2-page PDF URL.',
    'Recipient and sender can be either a contact ID string or an inline address object.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: z
        .union([z.string(), inlineAddressSchema])
        .describe('Recipient: a contact ID or inline address'),
      from: z
        .union([z.string(), inlineAddressSchema])
        .describe('Sender: a contact ID or inline address'),
      frontTemplateId: z
        .string()
        .optional()
        .describe('Template ID for the front of the postcard'),
      backTemplateId: z
        .string()
        .optional()
        .describe('Template ID for the back of the postcard'),
      frontHtml: z.string().optional().describe('Raw HTML for the front of the postcard'),
      backHtml: z.string().optional().describe('Raw HTML for the back of the postcard'),
      pdfUrl: z.string().optional().describe('URL to a 2-page PDF (front and back)'),
      size: z.enum(['6x4', '9x6', '11x6']).optional().describe('Postcard size (default: 6x4)'),
      description: z.string().optional().describe('Internal description'),
      mailingClass: z
        .string()
        .optional()
        .describe('Mailing class (e.g., first_class, standard_class)'),
      express: z.boolean().optional().describe('Use express shipping'),
      mergeVariables: z
        .record(z.string(), z.any())
        .optional()
        .describe('Merge variables for template personalization'),
      sendDate: z.string().optional().describe('Scheduled send date (ISO 8601)'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom key-value metadata')
    })
  )
  .output(
    z.object({
      postcardId: z.string().describe('ID of the created postcard'),
      status: z.string().describe('Current status'),
      sendDate: z.string().optional().nullable().describe('Scheduled send date'),
      url: z.string().optional().nullable().describe('URL to the rendered PDF'),
      createdAt: z.string().optional().nullable().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrintMailClient(ctx.auth.token);

    let requestData: Record<string, any> = {
      to: ctx.input.to,
      from: ctx.input.from
    };

    if (ctx.input.frontTemplateId) requestData.frontTemplate = ctx.input.frontTemplateId;
    if (ctx.input.backTemplateId) requestData.backTemplate = ctx.input.backTemplateId;
    if (ctx.input.frontHtml) requestData.frontHTML = ctx.input.frontHtml;
    if (ctx.input.backHtml) requestData.backHTML = ctx.input.backHtml;
    if (ctx.input.pdfUrl) requestData.pdf = ctx.input.pdfUrl;
    if (ctx.input.size) requestData.size = ctx.input.size;
    if (ctx.input.description) requestData.description = ctx.input.description;
    if (ctx.input.mailingClass) requestData.mailingClass = ctx.input.mailingClass;
    if (ctx.input.express !== undefined) requestData.express = ctx.input.express;
    if (ctx.input.mergeVariables) requestData.mergeVariables = ctx.input.mergeVariables;
    if (ctx.input.sendDate) requestData.sendDate = ctx.input.sendDate;
    if (ctx.input.metadata) requestData.metadata = ctx.input.metadata;

    let postcard = await client.createPostcard(requestData as any);

    return {
      output: {
        postcardId: postcard.id,
        status: postcard.status,
        sendDate: postcard.sendDate,
        url: postcard.url,
        createdAt: postcard.createdAt
      },
      message: `Postcard **${postcard.id}** created with status **${postcard.status}**.`
    };
  })
  .build();
