import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignWellClient } from '../lib/client';
import { spec } from '../spec';

export let createDocumentFromTemplate = SlateTool.create(spec, {
  name: 'Create Document from Template',
  key: 'create_document_from_template',
  description: `Create a new document for signing based on a pre-built template. Fill in recipient details and template field values dynamically. The document can be sent immediately or saved as a draft.`,
  instructions: [
    'The placeholderName for each recipient must match a placeholder defined in the template.',
    'Use templateFields to pre-fill form fields defined in the template by their apiId.'
  ],
  constraints: ['Rate limited to 30 document creation requests per minute.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to create the document from'),
      draft: z.boolean().optional().describe('If true, document is created but not sent'),
      embeddedSigning: z.boolean().optional().describe('Enable embedded signing'),
      embeddedSigningNotifications: z
        .boolean()
        .optional()
        .describe('Send email notifications even with embedded signing'),
      reminders: z.boolean().optional().describe('Enable automatic reminders'),
      subject: z.string().optional().describe('Email subject line override'),
      message: z.string().optional().describe('Email message body override'),
      expiresIn: z.number().optional().describe('Number of days until the document expires'),
      recipients: z
        .array(
          z.object({
            placeholderName: z
              .string()
              .describe('Name of the placeholder in the template to assign this recipient to'),
            name: z.string().describe('Full name of the recipient'),
            email: z.string().describe('Email address of the recipient')
          })
        )
        .describe('Recipients mapped to template placeholders'),
      templateFields: z
        .array(
          z.object({
            apiId: z.string().describe('API identifier of the template field'),
            value: z.string().describe('Value to fill into the field')
          })
        )
        .optional()
        .describe('Template fields to pre-fill with values'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata key-value pairs')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Unique ID of the created document'),
      name: z.string().optional().describe('Name of the document'),
      status: z.string().optional().describe('Current status of the document'),
      embeddedSigningUrl: z.string().optional().describe('URL for embedded signing'),
      recipients: z
        .array(
          z.object({
            recipientId: z.string().optional().describe('ID of the recipient'),
            name: z.string().optional().describe('Name of the recipient'),
            email: z.string().optional().describe('Email of the recipient'),
            status: z.string().optional().describe('Signing status'),
            embeddedSigningUrl: z
              .string()
              .optional()
              .describe('Embedded signing URL for this recipient')
          })
        )
        .optional()
        .describe('List of recipients'),
      createdAt: z.string().optional().describe('Document creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignWellClient({ token: ctx.auth.token });

    let result = await client.createDocumentFromTemplate({
      templateId: ctx.input.templateId,
      testMode: ctx.config.testMode,
      draft: ctx.input.draft,
      embeddedSigning: ctx.input.embeddedSigning,
      embeddedSigningNotifications: ctx.input.embeddedSigningNotifications,
      reminders: ctx.input.reminders,
      subject: ctx.input.subject,
      message: ctx.input.message,
      expiresIn: ctx.input.expiresIn,
      recipients: ctx.input.recipients,
      templateFields: ctx.input.templateFields,
      metadata: ctx.input.metadata as Record<string, string> | undefined
    });

    let output = {
      documentId: result.id,
      name: result.name,
      status: result.status,
      embeddedSigningUrl: result.embedded_signing_url,
      recipients: result.recipients?.map((r: any) => ({
        recipientId: r.id,
        name: r.name,
        email: r.email,
        status: r.status,
        embeddedSigningUrl: r.embedded_signing_url
      })),
      createdAt: result.created_at
    };

    let statusMsg = ctx.input.draft ? 'as draft' : 'and sent';
    return {
      output,
      message: `Document created from template ${statusMsg} with ${ctx.input.recipients.length} recipient(s).`
    };
  })
  .build();
