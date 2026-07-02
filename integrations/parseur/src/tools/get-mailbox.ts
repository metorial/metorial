import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMailbox = SlateTool.create(spec, {
  name: 'Get Mailbox',
  key: 'get_mailbox',
  description: `Retrieve detailed information about a specific mailbox (parser), including its configuration, document counts by status, email address for submissions, AI engine settings, and associated webhooks/templates. Use this to inspect a mailbox before uploading documents or to check its schema.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mailboxId: z.number().describe('ID of the mailbox to retrieve'),
      includeSchema: z
        .boolean()
        .optional()
        .describe('Also fetch the mailbox schema describing extracted fields')
    })
  )
  .output(
    z.object({
      mailboxId: z.number().describe('Mailbox ID'),
      name: z.string().describe('Mailbox name'),
      emailPrefix: z.string().describe('Email prefix for the mailbox'),
      emailAddress: z.string().describe('Full email address for sending documents'),
      aiEngine: z.string().describe('AI engine type'),
      identificationStatus: z.string().describe('Template identification status'),
      documentCount: z.number().describe('Total number of documents'),
      templateCount: z.number().describe('Number of templates'),
      webhookCount: z.number().describe('Number of webhooks'),
      processAttachments: z.boolean().describe('Whether email attachments are processed'),
      forceOcr: z.boolean().describe('Whether OCR is forced on all uploads'),
      retentionPolicy: z.number().nullable().describe('Document retention in days'),
      allowedExtensions: z.array(z.string()).describe('Accepted file extensions'),
      documentsByStatus: z.record(z.string(), z.number()).describe('Document count by status'),
      webhooks: z
        .array(
          z.object({
            webhookId: z.number(),
            event: z.string(),
            target: z.string(),
            name: z.string()
          })
        )
        .describe('Active webhooks on this mailbox'),
      schema: z
        .record(z.string(), z.any())
        .nullable()
        .describe('Mailbox schema describing extracted fields (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mailbox = await client.getMailbox(ctx.input.mailboxId);

    let schema: Record<string, any> | null = null;
    if (ctx.input.includeSchema) {
      schema = await client.getMailboxSchema(ctx.input.mailboxId);
    }

    let emailDomain = 'parseur.com';

    return {
      output: {
        mailboxId: mailbox.id,
        name: mailbox.name,
        emailPrefix: mailbox.email_prefix,
        emailAddress: `${mailbox.email_prefix}@${emailDomain}`,
        aiEngine: mailbox.ai_engine,
        identificationStatus: mailbox.identification_status,
        documentCount: mailbox.document_count,
        templateCount: mailbox.template_count,
        webhookCount: mailbox.webhook_count,
        processAttachments: mailbox.process_attachments,
        forceOcr: mailbox.force_ocr,
        retentionPolicy: mailbox.retention_policy,
        allowedExtensions: mailbox.allowed_extensions || [],
        documentsByStatus: mailbox.document_per_status_count,
        webhooks: (mailbox.webhook_set || []).map(w => ({
          webhookId: w.id,
          event: w.event,
          target: w.target,
          name: w.name
        })),
        schema
      },
      message: `Retrieved mailbox **${mailbox.name}** (ID: ${mailbox.id}) with ${mailbox.document_count} documents.${schema ? ' Schema included.' : ''}`
    };
  })
  .build();
