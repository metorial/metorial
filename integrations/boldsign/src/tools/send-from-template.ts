import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let roleSchema = z.object({
  roleIndex: z.number().describe('Role index position as defined in the template'),
  signerName: z.string().describe('Full name of the signer for this role'),
  signerEmail: z.string().describe('Email address of the signer for this role'),
  signerType: z
    .enum(['Signer', 'InPersonSigner', 'Reviewer'])
    .optional()
    .describe('Type of signer. Defaults to Signer'),
  signerOrder: z.number().optional().describe('Signing order position'),
  locale: z.string().optional().describe('Locale for the signer, e.g. "EN"'),
  privateMessage: z.string().optional().describe('Private message visible only to this signer')
});

export let sendFromTemplate = SlateTool.create(spec, {
  name: 'Send from Template',
  key: 'send_from_template',
  description: `Create and send a document for signature based on an existing template. Map template roles to actual signers and optionally customize title, message, branding, and reminder settings.`,
  instructions: [
    'The templateId must reference an existing template.',
    'Each role in the template must be mapped to a signer via the roles array with matching roleIndex values.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to use'),
      title: z
        .string()
        .optional()
        .describe('Custom document title (overrides template title)'),
      message: z
        .string()
        .optional()
        .describe('Message included in the signing notification email'),
      roles: z.array(roleSchema).min(1).describe('Signer assignments for each template role'),
      cc: z
        .array(
          z.object({
            emailAddress: z.string().describe('CC recipient email address')
          })
        )
        .optional()
        .describe('CC recipients who receive a copy but do not sign'),
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
      disableEmails: z
        .boolean()
        .optional()
        .describe('Suppress email notifications to signers'),
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

    let result = await client.sendFromTemplate(ctx.input);

    return {
      output: result,
      message: `Document created from template **${ctx.input.templateId}** with ID **${result.documentId}**. Processing asynchronously.`
    };
  })
  .build();
