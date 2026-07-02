import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let signerSchema = z.object({
  email: z.string().describe('Email address of the signer'),
  name: z.string().describe('Full name of the signer'),
  recipientId: z
    .string()
    .optional()
    .describe('Unique ID for the recipient within the envelope. Auto-assigned if omitted.'),
  routingOrder: z
    .string()
    .optional()
    .describe('Signing order (e.g., "1", "2"). Use same value for parallel signing.'),
  clientUserId: z
    .string()
    .optional()
    .describe('Set this to make the signer an embedded signer. Must be unique per signer.'),
  tabs: z
    .record(z.string(), z.any())
    .optional()
    .describe('Tabs (form fields) for this signer, e.g., signHereTabs, dateSignedTabs')
});

let carbonCopySchema = z.object({
  email: z.string().describe('Email address of the CC recipient'),
  name: z.string().describe('Full name of the CC recipient'),
  recipientId: z.string().optional().describe('Unique ID for the recipient'),
  routingOrder: z.string().optional().describe('Routing order for this recipient')
});

let documentSchema = z.object({
  name: z.string().describe('Display name of the document'),
  documentId: z
    .string()
    .describe('Unique ID for the document within the envelope (e.g., "1", "2")'),
  documentBase64: z.string().describe('Base64-encoded document content'),
  fileExtension: z
    .string()
    .optional()
    .describe('File extension (e.g., "pdf", "docx"). Inferred from name if omitted.'),
  order: z.string().optional().describe('Display order of the document')
});

export let sendEnvelope = SlateTool.create(spec, {
  name: 'Send Envelope',
  key: 'send_envelope',
  description: `Creates and sends a DocuSign envelope with documents for electronic signature.
Supports inline documents with signers, carbon copy recipients, sequential/parallel signing workflows, and embedded signing.
Set **status** to \`"sent"\` to send immediately or \`"created"\` to save as a draft.`,
  instructions: [
    'Provide at least one document and one signer to create an envelope.',
    'Set routingOrder to the same value for parallel signing, or different values for sequential signing.',
    'To enable embedded signing, set clientUserId on the signer.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      emailSubject: z.string().describe('Subject line of the email sent to recipients'),
      emailBlurb: z.string().optional().describe('Body text of the email sent to recipients'),
      status: z
        .enum(['created', 'sent'])
        .default('sent')
        .describe('Set to "sent" to send immediately, or "created" to save as draft'),
      documents: z
        .array(documentSchema)
        .min(1)
        .describe('Documents to include in the envelope'),
      signers: z.array(signerSchema).min(1).describe('Signers who need to sign the documents'),
      carbonCopies: z
        .array(carbonCopySchema)
        .optional()
        .describe('Recipients who receive a copy of the signed documents'),
      notification: z
        .object({
          reminderEnabled: z.boolean().optional().describe('Enable email reminders'),
          reminderDelay: z
            .string()
            .optional()
            .describe('Days before first reminder (e.g., "3")'),
          reminderFrequency: z
            .string()
            .optional()
            .describe('Days between reminders (e.g., "2")'),
          expireEnabled: z.boolean().optional().describe('Enable envelope expiration'),
          expireAfter: z.string().optional().describe('Days until expiration (e.g., "120")'),
          expireWarn: z
            .string()
            .optional()
            .describe('Days before expiration to warn (e.g., "3")')
        })
        .optional()
        .describe('Reminder and expiration settings')
    })
  )
  .output(
    z.object({
      envelopeId: z.string().describe('ID of the created envelope'),
      status: z.string().describe('Current status of the envelope'),
      statusDateTime: z.string().optional().describe('Timestamp of the status change'),
      uri: z.string().optional().describe('URI for the envelope resource')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUri: ctx.auth.baseUri,
      accountId: ctx.auth.accountId
    });

    let signers = ctx.input.signers.map((s, i) => ({
      email: s.email,
      name: s.name,
      recipientId: s.recipientId || String(i + 1),
      routingOrder: s.routingOrder || String(i + 1),
      clientUserId: s.clientUserId,
      tabs: s.tabs
    }));

    let carbonCopies = ctx.input.carbonCopies?.map((cc, i) => ({
      email: cc.email,
      name: cc.name,
      recipientId: cc.recipientId || String(signers.length + i + 1),
      routingOrder: cc.routingOrder || String(signers.length + i + 1)
    }));

    let notification = ctx.input.notification
      ? {
          useAccountDefaults: 'false',
          reminders: ctx.input.notification.reminderEnabled
            ? {
                reminderEnabled: 'true',
                reminderDelay: ctx.input.notification.reminderDelay || '3',
                reminderFrequency: ctx.input.notification.reminderFrequency || '2'
              }
            : undefined,
          expirations: ctx.input.notification.expireEnabled
            ? {
                expireEnabled: 'true',
                expireAfter: ctx.input.notification.expireAfter || '120',
                expireWarn: ctx.input.notification.expireWarn || '3'
              }
            : undefined
        }
      : undefined;

    let result = await client.createEnvelope({
      emailSubject: ctx.input.emailSubject,
      emailBlurb: ctx.input.emailBlurb,
      status: ctx.input.status,
      documents: ctx.input.documents,
      recipients: {
        signers,
        carbonCopies
      },
      notification
    });

    return {
      output: {
        envelopeId: result.envelopeId,
        status: result.status,
        statusDateTime: result.statusDateTime,
        uri: result.uri
      },
      message: `Envelope **${result.envelopeId}** ${ctx.input.status === 'sent' ? 'sent' : 'created as draft'} with subject "${ctx.input.emailSubject}" to ${ctx.input.signers.length} signer(s).`
    };
  })
  .build();
