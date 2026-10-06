import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fieldMap, recipientMap, summaryMap } from '../lib/schemas';
import { clientConfig } from '../lib/validation';
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
  fields: z
    .array(
      z.object({
        fieldId: z.number(),
        type: z.string(),
        pageNumber: z.number(),
        pageX: z.number(),
        pageY: z.number(),
        width: z.number(),
        height: z.number(),
        envelopeItemId: z.string(),
        recipientId: z.number()
      })
    )
    .describe('Fields and exact recipient/PDF item IDs'),
  items: z
    .array(z.object({ envelopeItemId: z.string(), title: z.string(), order: z.number() }))
    .describe('PDF items available to download'),
  teamId: z.number().optional(),
  ownerId: z.number().optional(),
  externalId: z.string().optional(),
  folderId: z.string().optional(),
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
    const e = await new Client(clientConfig(ctx)).getEnvelope(ctx.input.envelopeId);
    return {
      output: {
        ...summaryMap(e),
        recipients: e.recipients.map(recipientMap),
        fields: e.fields.map(fieldMap),
        items: e.envelopeItems.map(i => ({
          envelopeItemId: i.id,
          title: i.title,
          order: i.order
        })),
        subject: e.documentMeta?.subject ?? undefined,
        message: e.documentMeta?.message ?? undefined
      },
      message: `Retrieved envelope ${e.id} (${e.status}).`
    };
  })
  .build();
