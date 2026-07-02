import { SlateTool } from 'slates';
import { z } from 'zod';
import { BackendlessClient } from '../lib/client';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Sends an email using a pre-defined Backendless email template. Templates must be created in Backendless Console first. Supports dynamic placeholder values, recipient specification by address or SQL query against the Users table, CC/BCC, and file attachments from Backendless file storage.`,
  instructions: [
    'The template must already exist in Backendless Console under Messaging > Email Templates.',
    'Use `templateValues` to fill dynamic placeholder fields defined in the template.',
    'Recipients can be specified explicitly via `toAddresses` or dynamically via `recipientCriteria` (a where clause against the Users table).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateName: z
        .string()
        .describe('Name of the email template as defined in Backendless Console'),
      toAddresses: z
        .array(z.string())
        .optional()
        .describe('List of recipient email addresses'),
      ccAddresses: z.array(z.string()).optional().describe('CC recipient email addresses'),
      bccAddresses: z.array(z.string()).optional().describe('BCC recipient email addresses'),
      recipientCriteria: z
        .string()
        .optional()
        .describe(
          'SQL where clause to select recipients from the Users table, e.g. "age > 21"'
        ),
      uniqueEmails: z
        .boolean()
        .optional()
        .describe('If true (default), excludes duplicate email addresses'),
      templateValues: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Key-value pairs to substitute in template placeholders'),
      attachments: z
        .array(z.string())
        .optional()
        .describe('File paths in Backendless storage to attach to the email')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the email was sent successfully'),
      response: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Response details from the email API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BackendlessClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      region: ctx.config.region
    });

    let result = await client.sendEmailFromTemplate({
      templateName: ctx.input.templateName,
      addresses: ctx.input.toAddresses,
      ccAddresses: ctx.input.ccAddresses,
      bccAddresses: ctx.input.bccAddresses,
      criteria: ctx.input.recipientCriteria,
      uniqueEmails: ctx.input.uniqueEmails,
      templateValues: ctx.input.templateValues,
      attachments: ctx.input.attachments
    });

    return {
      output: {
        sent: true,
        response: result
      },
      message: `Sent email using template **${ctx.input.templateName}**${ctx.input.toAddresses ? ` to ${ctx.input.toAddresses.join(', ')}` : ''}.`
    };
  })
  .build();
