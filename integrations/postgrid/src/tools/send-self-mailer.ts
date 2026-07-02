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

export let sendSelfMailer = SlateTool.create(spec, {
  name: 'Send Self-Mailer',
  key: 'send_self_mailer',
  description: `Send a physical self-mailer (folded mail without an envelope) through PostGrid. Provide content as template IDs, HTML, or a PDF URL.`,
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
      templateId: z.string().optional().describe('Template ID for content'),
      html: z.string().optional().describe('Raw HTML content'),
      pdfUrl: z.string().optional().describe('URL to a PDF file'),
      insideTemplateId: z.string().optional().describe('Template ID for the inside'),
      insideHtml: z.string().optional().describe('Raw HTML for the inside'),
      outsideTemplateId: z.string().optional().describe('Template ID for the outside'),
      outsideHtml: z.string().optional().describe('Raw HTML for the outside'),
      size: z.string().optional().describe('Self-mailer size'),
      description: z.string().optional().describe('Internal description'),
      mailingClass: z
        .string()
        .optional()
        .describe('Mailing class (e.g., first_class, standard_class)'),
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
      selfMailerId: z.string().describe('ID of the created self-mailer'),
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

    if (ctx.input.templateId) requestData.template = ctx.input.templateId;
    if (ctx.input.html) requestData.html = ctx.input.html;
    if (ctx.input.pdfUrl) requestData.pdf = ctx.input.pdfUrl;
    if (ctx.input.insideTemplateId) requestData.insideTemplate = ctx.input.insideTemplateId;
    if (ctx.input.insideHtml) requestData.insideHTML = ctx.input.insideHtml;
    if (ctx.input.outsideTemplateId) requestData.outsideTemplate = ctx.input.outsideTemplateId;
    if (ctx.input.outsideHtml) requestData.outsideHTML = ctx.input.outsideHtml;
    if (ctx.input.size) requestData.size = ctx.input.size;
    if (ctx.input.description) requestData.description = ctx.input.description;
    if (ctx.input.mailingClass) requestData.mailingClass = ctx.input.mailingClass;
    if (ctx.input.mergeVariables) requestData.mergeVariables = ctx.input.mergeVariables;
    if (ctx.input.sendDate) requestData.sendDate = ctx.input.sendDate;
    if (ctx.input.metadata) requestData.metadata = ctx.input.metadata;

    let selfMailer = await client.createSelfMailer(requestData as any);

    return {
      output: {
        selfMailerId: selfMailer.id,
        status: selfMailer.status,
        sendDate: selfMailer.sendDate,
        url: selfMailer.url,
        createdAt: selfMailer.createdAt
      },
      message: `Self-mailer **${selfMailer.id}** created with status **${selfMailer.status}**.`
    };
  })
  .build();
