import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let recipientSchema = z.object({
  recipientId: z.number().describe('Unique identifier of the recipient'),
  email: z.string().describe('Recipient email address'),
  name: z.string().describe('Recipient name'),
  role: z.string().describe('Recipient role (SIGNER, VIEWER, APPROVER, CC)'),
  signingStatus: z.string().describe('Current signing status'),
  signingOrder: z.number().optional().describe('Order in which the recipient signs')
});

let envelopeDetailSchema = z.object({
  envelopeId: z.string().describe('Unique identifier of the envelope'),
  title: z.string().describe('Title of the envelope'),
  status: z.string().describe('Current status of the envelope'),
  type: z.string().describe('Type: DOCUMENT or TEMPLATE'),
  createdAt: z.string().describe('ISO timestamp when the envelope was created'),
  updatedAt: z.string().describe('ISO timestamp when the envelope was last updated'),
  recipients: z.array(recipientSchema).describe('List of recipients'),
  subject: z.string().optional().describe('Email subject line'),
  message: z.string().optional().describe('Email message body')
});

export let getEnvelopeTool = SlateTool.create(spec, {
  name: 'Get Envelope',
  key: 'get_envelope',
  description: `Retrieve detailed information about a specific envelope including its recipients, status, and metadata. Use this to check the current state of a document or template.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      envelopeId: z.string().describe('ID of the envelope to retrieve')
    })
  )
  .output(envelopeDetailSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let envelope = await client.getEnvelope(ctx.input.envelopeId);

    let recipients = (envelope.recipients ?? []) as Record<string, unknown>[];

    return {
      output: {
        envelopeId: String(envelope.id ?? envelope.envelopeId ?? ''),
        title: String(envelope.title ?? ''),
        status: String(envelope.status ?? ''),
        type: String(envelope.type ?? ''),
        createdAt: String(envelope.createdAt ?? ''),
        updatedAt: String(envelope.updatedAt ?? ''),
        recipients: recipients.map((r: Record<string, unknown>) => ({
          recipientId: Number(r.id ?? r.recipientId ?? 0),
          email: String(r.email ?? ''),
          name: String(r.name ?? ''),
          role: String(r.role ?? ''),
          signingStatus: String(r.signingStatus ?? r.status ?? ''),
          signingOrder: r.signingOrder != null ? Number(r.signingOrder) : undefined
        })),
        subject: envelope.meta?.subject ? String(envelope.meta.subject) : undefined,
        message: envelope.meta?.message ? String(envelope.meta.message) : undefined
      },
      message: `Retrieved envelope "${envelope.title}" (status: ${envelope.status}).`
    };
  })
  .build();
