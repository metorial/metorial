import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
    country: z
      .string()
      .optional()
      .describe('ISO 3166-1 Alpha-2 country code (e.g. US, GB, CA)')
  })
  .describe('Inline recipient address details for a new recipient');

export let sendLetter = SlateTool.create(spec, {
  name: 'Send Letter',
  key: 'send_letter',
  description: `Send a letter to a recipient. Supports mail-merged letters via template ID or fully pre-formatted letters via file URL/base64. Options include duplex printing, first-class postage, and test mode.`,
  instructions: [
    'Provide either a templateId or a file URL/base64 for the letter content.',
    'Provide either recipientId for an existing recipient OR inline recipient details.',
    'Set test to true to generate a sample PDF without dispatch or charges.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      recipientId: z.number().optional().describe('Existing recipient ID to send to'),
      recipient: recipientSchema.optional(),
      templateId: z.number().optional().describe('Pre-configured letter template ID'),
      file: z.string().optional().describe('PDF/DOC file as URL or base64 (max 10 pages)'),
      duplex: z.boolean().optional().describe('Print double-sided (defaults to true)'),
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
      mailpieceId: z.string().describe('ID of the created letter mailpiece'),
      pdfUrl: z.string().optional().describe('URL to the generated PDF'),
      status: z.string().optional().describe('Current status of the letter'),
      cost: z.string().optional().describe('Cost of the letter'),
      format: z.string().optional().describe('Letter format'),
      created: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let recipientValue: number | Record<string, any>;
    if (ctx.input.recipientId) {
      recipientValue = ctx.input.recipientId;
    } else if (ctx.input.recipient) {
      recipientValue = ctx.input.recipient;
    } else {
      throw new Error('Either recipientId or recipient details must be provided');
    }

    let result = await client.createLetter({
      template: ctx.input.templateId,
      file: ctx.input.file,
      recipient: recipientValue,
      duplex: ctx.input.duplex,
      tags: ctx.input.tags,
      addons: ctx.input.addons,
      test: ctx.input.test,
      postUnverified: ctx.input.postUnverified
    });

    return {
      output: {
        mailpieceId: String(result.id),
        pdfUrl: result.pdf,
        status: result.status,
        cost: result.cost,
        format: result.format,
        created: result.created
      },
      message: ctx.input.test
        ? `Test letter generated. PDF available at: ${result.pdf}`
        : `Letter created with ID **${result.id}**. Status: ${result.status}`
    };
  })
  .build();
