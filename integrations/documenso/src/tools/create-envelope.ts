import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEnvelopeTool = SlateTool.create(spec, {
  name: 'Create Envelope',
  key: 'create_envelope',
  description: `Create a new envelope (document or template) in Documenso. Optionally attach PDF files (base64-encoded), add recipients, and configure signing metadata in a single call. After creation, use the **Distribute Envelope** tool to send it to recipients.`,
  instructions: [
    'Files must be base64-encoded PDF content.',
    'Recipients can be added during creation or separately afterwards.',
    'Use type TEMPLATE to create reusable templates.'
  ]
})
  .input(
    z.object({
      title: z.string().describe('Title of the envelope'),
      type: z
        .enum(['DOCUMENT', 'TEMPLATE'])
        .default('DOCUMENT')
        .describe('Whether to create a document or template'),
      folderId: z.string().optional().describe('Folder ID to place the envelope in'),
      files: z
        .array(
          z.object({
            fileName: z.string().describe('Name of the PDF file'),
            fileData: z.string().describe('Base64-encoded PDF file content')
          })
        )
        .optional()
        .describe('PDF files to attach to the envelope'),
      recipients: z
        .array(
          z.object({
            email: z.string().describe('Recipient email address'),
            name: z.string().optional().describe('Recipient display name'),
            role: z
              .enum(['SIGNER', 'VIEWER', 'APPROVER', 'CC'])
              .optional()
              .describe('Recipient role'),
            signingOrder: z
              .number()
              .optional()
              .describe('Signing order for sequential signing')
          })
        )
        .optional()
        .describe('Recipients to add to the envelope'),
      subject: z.string().optional().describe('Email subject line for distribution'),
      emailMessage: z.string().optional().describe('Email message body for distribution'),
      signingOrder: z
        .enum(['PARALLEL', 'SEQUENTIAL'])
        .optional()
        .describe('Whether recipients sign in parallel or sequentially'),
      redirectUrl: z.string().optional().describe('URL to redirect recipients after signing'),
      language: z.string().optional().describe('Language code for the signing experience'),
      timezone: z.string().optional().describe('Timezone for date display'),
      dateFormat: z.string().optional().describe('Date format string')
    })
  )
  .output(
    z.object({
      envelopeId: z.string().describe('ID of the created envelope')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let meta: Record<string, unknown> = {};
    if (ctx.input.subject) meta.subject = ctx.input.subject;
    if (ctx.input.emailMessage) meta.message = ctx.input.emailMessage;
    if (ctx.input.signingOrder) meta.signingOrder = ctx.input.signingOrder;
    if (ctx.input.redirectUrl) meta.redirectUrl = ctx.input.redirectUrl;
    if (ctx.input.language) meta.language = ctx.input.language;
    if (ctx.input.timezone) meta.timezone = ctx.input.timezone;
    if (ctx.input.dateFormat) meta.dateFormat = ctx.input.dateFormat;

    let result = await client.createEnvelope(
      {
        title: ctx.input.title,
        type: ctx.input.type,
        folderId: ctx.input.folderId,
        recipients: ctx.input.recipients,
        meta: Object.keys(meta).length > 0 ? meta : undefined
      },
      ctx.input.files?.map(f => ({ name: f.fileName, data: f.fileData }))
    );

    let envelopeId = String(result.id ?? result.envelopeId ?? '');

    return {
      output: { envelopeId },
      message: `Created envelope "${ctx.input.title}" with ID \`${envelopeId}\`.`
    };
  })
  .build();
