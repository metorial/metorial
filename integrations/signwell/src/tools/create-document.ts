import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignWellClient } from '../lib/client';
import { spec } from '../spec';

let recipientSchema = z.object({
  id: z
    .string()
    .describe('Unique identifier for this recipient, used to reference them in fields'),
  name: z.string().describe('Full name of the recipient'),
  email: z.string().describe('Email address of the recipient'),
  signingOrder: z
    .number()
    .optional()
    .describe('Signing order position (requires applySigningOrder to be true)')
});

let fileSchema = z.object({
  name: z.string().describe('Name of the file'),
  fileUrl: z.string().optional().describe('Publicly accessible URL to the document file'),
  fileBase64: z.string().optional().describe('Base64-encoded file content')
});

let fieldSchema = z.object({
  type: z.string().describe('Field type: signature, initials, date, text, checkbox, etc.'),
  required: z.boolean().optional().describe('Whether the field is required'),
  x: z.number().describe('X coordinate position on the page'),
  y: z.number().describe('Y coordinate position on the page'),
  page: z.number().describe('Page number (0-indexed)'),
  recipientId: z.string().describe('ID of the recipient this field is assigned to'),
  apiId: z.string().optional().describe('Custom API identifier for the field'),
  width: z.number().optional().describe('Width of the field'),
  height: z.number().optional().describe('Height of the field'),
  dateFormat: z.string().optional().describe('Date format for date fields'),
  value: z.string().optional().describe('Pre-filled value for the field'),
  fixedWidth: z.boolean().optional().describe('Whether the field has a fixed width'),
  lockSignDate: z.boolean().optional().describe('Whether to lock the sign date')
});

export let createDocument = SlateTool.create(spec, {
  name: 'Create Document',
  key: 'create_document',
  description: `Create a new document for electronic signing by uploading files and defining recipients. Supports configuring signing fields, signing order, embedded signing, reminders, and more. The document can be created as a draft or sent immediately to recipients.`,
  instructions: [
    'Provide at least one file (via URL or base64) and at least one recipient.',
    'Set draft to true to create without sending. Omit or set to false to send immediately.',
    'Use applySigningOrder with recipient signingOrder to enforce sequential signing.'
  ],
  constraints: [
    'Rate limited to 30 document creation requests per minute.',
    'Test mode limited to 20 requests per minute.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Name/title of the document'),
      subject: z.string().optional().describe('Email subject line for signing notification'),
      message: z.string().optional().describe('Email message body for signing notification'),
      draft: z
        .boolean()
        .optional()
        .describe('If true, document is created but not sent to recipients'),
      embeddedSigning: z
        .boolean()
        .optional()
        .describe('Enable embedded signing for in-app signing experience'),
      embeddedSigningNotifications: z
        .boolean()
        .optional()
        .describe('Send email notifications even with embedded signing'),
      reminders: z
        .boolean()
        .optional()
        .describe('Enable automatic reminders for unsigned recipients'),
      applySigningOrder: z.boolean().optional().describe('Enforce sequential signing order'),
      textTags: z
        .boolean()
        .optional()
        .describe('Enable text tag parsing in the uploaded document'),
      allowDecline: z.boolean().optional().describe('Allow recipients to decline signing'),
      allowReassign: z
        .boolean()
        .optional()
        .describe('Allow recipients to reassign their signing to someone else'),
      expiresIn: z.number().optional().describe('Number of days until the document expires'),
      files: z.array(fileSchema).optional().describe('Files to be signed'),
      recipients: z
        .array(recipientSchema)
        .describe('Recipients who need to sign the document'),
      fields: z
        .array(z.array(fieldSchema))
        .optional()
        .describe('Signing fields grouped by page, each group is an array of fields'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata key-value pairs to attach to the document'),
      copiedContacts: z
        .array(
          z.object({
            email: z.string().describe('Email of the CC contact'),
            name: z.string().optional().describe('Name of the CC contact')
          })
        )
        .optional()
        .describe('Contacts to CC on the document')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Unique ID of the created document'),
      name: z.string().optional().describe('Name of the document'),
      status: z.string().optional().describe('Current status of the document'),
      embeddedSigningUrl: z
        .string()
        .optional()
        .describe('URL for embedded signing (if embedded signing is enabled)'),
      recipients: z
        .array(
          z.object({
            recipientId: z.string().optional().describe('ID of the recipient'),
            name: z.string().optional().describe('Name of the recipient'),
            email: z.string().optional().describe('Email of the recipient'),
            status: z.string().optional().describe('Signing status of the recipient'),
            embeddedSigningUrl: z
              .string()
              .optional()
              .describe('Embedded signing URL for this recipient')
          })
        )
        .optional()
        .describe('List of recipients and their status'),
      createdAt: z.string().optional().describe('Document creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignWellClient({ token: ctx.auth.token });

    let result = await client.createDocument({
      name: ctx.input.name,
      subject: ctx.input.subject,
      message: ctx.input.message,
      draft: ctx.input.draft,
      testMode: ctx.config.testMode,
      embeddedSigning: ctx.input.embeddedSigning,
      embeddedSigningNotifications: ctx.input.embeddedSigningNotifications,
      reminders: ctx.input.reminders,
      applySigningOrder: ctx.input.applySigningOrder,
      textTags: ctx.input.textTags,
      allowDecline: ctx.input.allowDecline,
      allowReassign: ctx.input.allowReassign,
      expiresIn: ctx.input.expiresIn,
      files: ctx.input.files,
      recipients: ctx.input.recipients,
      fields: ctx.input.fields,
      metadata: ctx.input.metadata as Record<string, string> | undefined,
      copiedContacts: ctx.input.copiedContacts
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

    let statusMsg = ctx.input.draft ? 'as draft' : 'and sent to recipients';
    return {
      output,
      message: `Document **${result.name || result.id}** created ${statusMsg} with ${ctx.input.recipients.length} recipient(s).`
    };
  })
  .build();
