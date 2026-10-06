import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { clientConfig } from '../lib/validation';
import { spec } from '../spec';

export let createEnvelopeTool = SlateTool.create(spec, {
  name: 'Create Envelope',
  key: 'create_envelope',
  description: `Create a new envelope (document or template) in Documenso. Optionally attach PDF files (base64-encoded), add recipients, and configure signing metadata in a single call. After creation, use the **Distribute Envelope** tool to send it to recipients.`,
  instructions: [
    'Files must be base64-encoded PDF content.',
    'Recipients can be added during creation or separately afterwards. Omitted name defaults to empty and omitted role to SIGNER.',
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
    const client = new Client(clientConfig(ctx));
    const meta = {
      subject: ctx.input.subject,
      message: ctx.input.emailMessage,
      signingOrder: ctx.input.signingOrder,
      redirectUrl: ctx.input.redirectUrl,
      language: ctx.input.language,
      timezone: ctx.input.timezone,
      dateFormat: ctx.input.dateFormat
    };
    const result = await client.createEnvelope(
      {
        title: ctx.input.title,
        type: ctx.input.type,
        folderId: ctx.input.folderId,
        recipients: ctx.input.recipients,
        meta
      },
      ctx.input.files?.map(f => ({ name: f.fileName, data: f.fileData }))
    );
    return {
      output: { envelopeId: result.id },
      message: `Created draft envelope ${result.id}. It has not been sent.`
    };
  })
  .build();
