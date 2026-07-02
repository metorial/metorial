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

export let sendCheque = SlateTool.create(spec, {
  name: 'Send Cheque',
  key: 'send_cheque',
  description: `Send a physical cheque (check) through PostGrid. Requires a bank account ID, amount in cents, and recipient. Optionally attach an invoice letter using a template, HTML, or PDF.`,
  instructions: [
    'The amount is specified in **cents** (e.g., 15000 = $150.00).',
    'A bank account must be set up in PostGrid before sending cheques.'
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
      bankAccountId: z.string().describe('PostGrid bank account ID'),
      amountInCents: z.number().describe('Cheque amount in cents (e.g., 15000 = $150.00)'),
      chequeNumber: z.number().optional().describe('Custom cheque number'),
      memo: z.string().optional().describe('Memo line on the cheque'),
      message: z.string().optional().describe('HTML message to include in the letter'),
      letterTemplateId: z.string().optional().describe('Template ID for the attached letter'),
      letterHtml: z.string().optional().describe('Raw HTML for the attached letter'),
      letterPdfUrl: z.string().optional().describe('PDF URL for the attached letter'),
      description: z.string().optional().describe('Internal description'),
      redirectTo: z.string().optional().describe('Contact ID to redirect the cheque to'),
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
      chequeId: z.string().describe('ID of the created cheque'),
      status: z.string().describe('Current status'),
      amountInCents: z.number().describe('Cheque amount in cents'),
      sendDate: z.string().optional().nullable().describe('Scheduled send date'),
      url: z.string().optional().nullable().describe('URL to the rendered PDF'),
      createdAt: z.string().optional().nullable().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrintMailClient(ctx.auth.token);

    let requestData: Record<string, any> = {
      to: ctx.input.to,
      from: ctx.input.from,
      bankAccount: ctx.input.bankAccountId,
      amount: ctx.input.amountInCents
    };

    if (ctx.input.chequeNumber !== undefined) requestData.number = ctx.input.chequeNumber;
    if (ctx.input.memo) requestData.memo = ctx.input.memo;
    if (ctx.input.message) requestData.message = ctx.input.message;
    if (ctx.input.letterTemplateId) requestData.letterTemplate = ctx.input.letterTemplateId;
    if (ctx.input.letterHtml) requestData.letterHTML = ctx.input.letterHtml;
    if (ctx.input.letterPdfUrl) requestData.letterPDF = ctx.input.letterPdfUrl;
    if (ctx.input.description) requestData.description = ctx.input.description;
    if (ctx.input.redirectTo) requestData.redirectTo = ctx.input.redirectTo;
    if (ctx.input.mergeVariables) requestData.mergeVariables = ctx.input.mergeVariables;
    if (ctx.input.sendDate) requestData.sendDate = ctx.input.sendDate;
    if (ctx.input.metadata) requestData.metadata = ctx.input.metadata;

    let cheque = await client.createCheque(requestData as any);

    let amountDollars = (cheque.amount / 100).toFixed(2);

    return {
      output: {
        chequeId: cheque.id,
        status: cheque.status,
        amountInCents: cheque.amount,
        sendDate: cheque.sendDate,
        url: cheque.url,
        createdAt: cheque.createdAt
      },
      message: `Cheque **${cheque.id}** for **$${amountDollars}** created with status **${cheque.status}**.`
    };
  })
  .build();
