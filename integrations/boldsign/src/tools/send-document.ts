import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let signerSchema = z.object({
  name: z.string().describe('Full name of the signer'),
  emailAddress: z.string().describe('Email address of the signer'),
  signerType: z
    .enum(['Signer', 'InPersonSigner', 'Reviewer'])
    .optional()
    .describe('Type of signer. Defaults to Signer'),
  signerOrder: z
    .number()
    .optional()
    .describe('Signing order position (used with enableSigningOrder)'),
  locale: z.string().optional().describe('Locale for the signer, e.g. "EN"'),
  privateMessage: z
    .string()
    .optional()
    .describe('Private message visible only to this signer'),
  authenticationCode: z
    .string()
    .optional()
    .describe('Access code the signer must enter to view the document'),
  enableEmailOTP: z
    .boolean()
    .optional()
    .describe('Require email OTP verification for this signer')
});

export let sendDocument = SlateTool.create(spec, {
  name: 'Send Document',
  key: 'send_document',
  description: `Send a document for electronic signature to one or more recipients. Provide file URLs pointing to PDFs or other supported document formats, along with signer details. The document is processed asynchronously — you will receive a document ID immediately, but actual delivery is confirmed via webhooks.`,
  instructions: [
    'At least one signer is required.',
    'Provide documents via fileUrls (publicly accessible URLs to PDF, Word, etc.).',
    'Use enableSigningOrder with signerOrder on each signer to enforce a signing sequence.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().optional().describe('Document title displayed to recipients'),
      message: z
        .string()
        .optional()
        .describe('Message included in the signing notification email'),
      signers: z.array(signerSchema).min(1).describe('List of signers for the document'),
      cc: z
        .array(
          z.object({
            emailAddress: z.string().describe('CC recipient email address')
          })
        )
        .optional()
        .describe('CC recipients who receive a copy but do not sign'),
      fileUrls: z
        .array(z.string())
        .optional()
        .describe('Publicly accessible URLs to document files (PDF, Word, etc.)'),
      brandId: z.string().optional().describe('Brand ID for custom branding'),
      labels: z
        .array(z.string())
        .optional()
        .describe('Tags/labels for categorizing the document'),
      expiryDays: z.number().optional().describe('Number of days before the document expires'),
      enableReassign: z
        .boolean()
        .optional()
        .describe('Allow signers to reassign the document'),
      enablePrintAndSign: z
        .boolean()
        .optional()
        .describe('Allow signers to print, sign physically, and upload'),
      enableSigningOrder: z.boolean().optional().describe('Enforce sequential signing order'),
      disableEmails: z
        .boolean()
        .optional()
        .describe('Suppress email notifications to signers'),
      disableExpiryAlert: z.boolean().optional().describe('Suppress expiry alert emails'),
      onBehalfOf: z
        .string()
        .optional()
        .describe('Send the document on behalf of this email address'),
      reminderSettings: z
        .object({
          reminderDays: z.number().optional().describe('Days between reminders'),
          reminderCount: z.number().optional().describe('Total number of reminders to send')
        })
        .optional()
        .describe('Automatic reminder configuration')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the created document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.sendDocument(ctx.input);

    return {
      output: result,
      message: `Document sent successfully with ID **${result.documentId}**. The document is being processed asynchronously.`
    };
  })
  .build();
