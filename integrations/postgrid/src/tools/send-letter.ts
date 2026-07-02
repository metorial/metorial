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

export let sendLetter = SlateTool.create(spec, {
  name: 'Send Letter',
  key: 'send_letter',
  description: `Send a physical letter through PostGrid. Specify the recipient and sender as contact IDs or inline addresses. Provide content as a template ID, raw HTML, or a PDF URL. Supports options like color printing, double-sided, mailing class, and scheduled send dates.`,
  instructions: [
    'Provide exactly one content source: templateId, html, or pdfUrl.',
    'Recipient and sender can be either a contact ID string or an inline address object.',
    'Amount values for mergeVariables should be strings.'
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
      templateId: z.string().optional().describe('Template ID for the letter content'),
      html: z.string().optional().describe('Raw HTML content for the letter'),
      pdfUrl: z.string().optional().describe('URL to a PDF file for the letter content'),
      description: z.string().optional().describe('Internal description for this letter'),
      color: z.boolean().optional().describe('Print in color (default: false)'),
      doubleSided: z.boolean().optional().describe('Print double-sided (default: false)'),
      addressPlacement: z
        .string()
        .optional()
        .describe('Address placement option (e.g., insert_blank_page, top_first_page)'),
      mailingClass: z
        .string()
        .optional()
        .describe('Mailing class (e.g., first_class, standard_class)'),
      express: z.boolean().optional().describe('Use express shipping'),
      returnEnvelopeId: z.string().optional().describe('Return envelope ID to include'),
      mergeVariables: z
        .record(z.string(), z.any())
        .optional()
        .describe('Merge variables for template personalization'),
      sendDate: z.string().optional().describe('Scheduled send date (ISO 8601 format)'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom key-value metadata')
    })
  )
  .output(
    z.object({
      letterId: z.string().describe('ID of the created letter'),
      status: z.string().describe('Current status of the letter'),
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

    if (ctx.input.templateId) requestData.template = ctx.input.templateId;
    if (ctx.input.html) requestData.html = ctx.input.html;
    if (ctx.input.pdfUrl) requestData.pdf = ctx.input.pdfUrl;
    if (ctx.input.description) requestData.description = ctx.input.description;
    if (ctx.input.color !== undefined) requestData.color = ctx.input.color;
    if (ctx.input.doubleSided !== undefined) requestData.doubleSided = ctx.input.doubleSided;
    if (ctx.input.addressPlacement) requestData.addressPlacement = ctx.input.addressPlacement;
    if (ctx.input.mailingClass) requestData.mailingClass = ctx.input.mailingClass;
    if (ctx.input.express !== undefined) requestData.express = ctx.input.express;
    if (ctx.input.returnEnvelopeId) requestData.returnEnvelope = ctx.input.returnEnvelopeId;
    if (ctx.input.mergeVariables) requestData.mergeVariables = ctx.input.mergeVariables;
    if (ctx.input.sendDate) requestData.sendDate = ctx.input.sendDate;
    if (ctx.input.metadata) requestData.metadata = ctx.input.metadata;

    let letter = await client.createLetter(requestData as any);

    return {
      output: {
        letterId: letter.id,
        status: letter.status,
        sendDate: letter.sendDate,
        url: letter.url,
        createdAt: letter.createdAt
      },
      message: `Letter **${letter.id}** created with status **${letter.status}**.`
    };
  })
  .build();
