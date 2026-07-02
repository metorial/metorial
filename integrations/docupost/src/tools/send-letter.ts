import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let usStateSchema = z
  .string()
  .length(2)
  .describe('2-letter U.S. state abbreviation (e.g., "CA", "NY", "TX")');

export let sendLetter = SlateTool.create(spec, {
  name: 'Send Letter',
  key: 'send_letter',
  description: `Send a physical letter via U.S. mail through DocuPost. Provide recipient and sender addresses along with letter content as either a **PDF URL** or **raw HTML**. Supports options for color printing, double-sided printing, mail class, certified mail, and return envelopes.`,
  instructions: [
    'Provide letter content as either a PDF URL or HTML content, but not both.',
    'HTML content is limited to 9,000 characters and may render differently in print than on screen.',
    'PDF files should be 8.5x11 inches and max 10MB.',
    'States must be 2-letter U.S. abbreviations (e.g., "CA", "NY").',
    'Names must be under 40 characters.',
    'Letters can be canceled within one hour of sending.'
  ],
  constraints: [
    'Names (recipient and sender) must be less than 40 characters.',
    'HTML content limited to 9,000 characters.',
    'PDF files must be max 10MB and 8.5x11 inches recommended.',
    'Certified service level requires usps_first_class mail class.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      recipientName: z.string().max(40).describe('Recipient full name (max 40 characters)'),
      recipientCompany: z
        .string()
        .max(40)
        .optional()
        .describe('Recipient company name (max 40 characters)'),
      recipientAddress1: z.string().describe('Recipient street address'),
      recipientAddress2: z
        .string()
        .optional()
        .describe('Recipient address line 2 (apt, suite, etc.)'),
      recipientCity: z.string().describe('Recipient city'),
      recipientState: usStateSchema,
      recipientZip: z.string().describe('Recipient 5-digit ZIP code'),
      senderName: z.string().max(40).describe('Sender full name (max 40 characters)'),
      senderAddress1: z.string().describe('Sender street address'),
      senderAddress2: z
        .string()
        .optional()
        .describe('Sender address line 2 (apt, suite, etc.)'),
      senderCity: z.string().describe('Sender city'),
      senderState: usStateSchema,
      senderZip: z.string().describe('Sender 5-digit ZIP code'),
      pdfUrl: z
        .string()
        .optional()
        .describe('URL of the PDF document to send. Either pdfUrl or html is required.'),
      html: z
        .string()
        .max(9000)
        .optional()
        .describe(
          'Raw HTML content for the letter (max 9,000 characters). Either pdfUrl or html is required.'
        ),
      color: z.boolean().optional().describe('Print in color (default: false)'),
      doubleSided: z.boolean().optional().describe('Print double-sided (default: true)'),
      mailClass: z
        .enum([
          'usps_first_class',
          'usps_standard',
          'usps_priority_mail',
          'usps_priority_mail_express'
        ])
        .optional()
        .describe('USPS mail class (default: usps_first_class)'),
      serviceLevel: z
        .enum(['certified', 'certified_return_receipt'])
        .optional()
        .describe('Service level for certified mail (requires usps_first_class mail class)'),
      returnEnvelope: z
        .boolean()
        .optional()
        .describe('Include a return envelope (default: false)'),
      prepaidReturnEnvelope: z
        .boolean()
        .optional()
        .describe('Include a prepaid return envelope (default: false)'),
      description: z
        .string()
        .max(40)
        .optional()
        .describe('Internal description visible in dashboard and exports (max 40 characters)')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the send letter request'),
      response: z.any().optional().describe('Raw response from the DocuPost API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendLetter({
      toName: ctx.input.recipientName,
      toCompany: ctx.input.recipientCompany,
      toAddress1: ctx.input.recipientAddress1,
      toAddress2: ctx.input.recipientAddress2,
      toCity: ctx.input.recipientCity,
      toState: ctx.input.recipientState,
      toZip: ctx.input.recipientZip,
      fromName: ctx.input.senderName,
      fromAddress1: ctx.input.senderAddress1,
      fromAddress2: ctx.input.senderAddress2,
      fromCity: ctx.input.senderCity,
      fromState: ctx.input.senderState,
      fromZip: ctx.input.senderZip,
      pdfUrl: ctx.input.pdfUrl,
      html: ctx.input.html,
      color: ctx.input.color,
      doubleSided: ctx.input.doubleSided,
      mailClass: ctx.input.mailClass,
      serviceLevel: ctx.input.serviceLevel,
      returnEnvelope: ctx.input.returnEnvelope,
      prepaidReturnEnvelope: ctx.input.prepaidReturnEnvelope,
      description: ctx.input.description
    });

    ctx.info({
      message: 'Letter sent successfully',
      recipientName: ctx.input.recipientName,
      recipientCity: ctx.input.recipientCity,
      recipientState: ctx.input.recipientState
    });

    return {
      output: {
        status: 'success',
        response: result
      },
      message: `Letter sent to **${ctx.input.recipientName}** at ${ctx.input.recipientCity}, ${ctx.input.recipientState} ${ctx.input.recipientZip}. You can cancel this letter within one hour from the DocuPost dashboard.`
    };
  })
  .build();
