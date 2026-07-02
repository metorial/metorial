import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let signerSchema = z.object({
  name: z.string().describe('Full name of the signer'),
  emailAddress: z.string().describe('Email address of the signer'),
  order: z
    .number()
    .optional()
    .describe('Signing order (0-indexed). Use when signers must sign in sequence.'),
  pin: z
    .string()
    .optional()
    .describe('Access code required for the signer to view the document'),
  smsPhoneNumber: z.string().optional().describe('Phone number for SMS PIN verification'),
  smsPhoneNumberType: z
    .enum(['authentication', 'delivery'])
    .optional()
    .describe('Whether the SMS number is for authentication or delivery')
});

export let sendSignatureRequest = SlateTool.create(spec, {
  name: 'Send Signature Request',
  key: 'send_signature_request',
  description: `Send documents for electronic signature to one or more signers via email. Supports uploading documents via URL, setting signer order, adding CC recipients, access codes for signer authentication, and attaching metadata.`,
  instructions: [
    'Provide at least one file URL and at least one signer.',
    'Use testMode=true for testing without consuming signature requests.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().optional().describe('Title of the signature request'),
      subject: z.string().optional().describe('Subject line of the email sent to signers'),
      message: z.string().optional().describe('Message body of the email sent to signers'),
      signers: z.array(signerSchema).min(1).describe('List of signers for this request'),
      fileUrls: z
        .array(z.string())
        .min(1)
        .describe('URLs of documents to be signed (PDF or other supported formats)'),
      ccEmailAddresses: z
        .array(z.string())
        .optional()
        .describe('Email addresses to CC on the signature request'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value metadata pairs (max 10 entries)'),
      allowDecline: z.boolean().optional().describe('Allow signers to decline the request'),
      allowReassign: z
        .boolean()
        .optional()
        .describe('Allow signers to reassign to another person'),
      useTextTags: z
        .boolean()
        .optional()
        .describe('Enable text tags in documents for field placement'),
      signingRedirectUrl: z
        .string()
        .optional()
        .describe('URL to redirect signers to after signing'),
      testMode: z
        .boolean()
        .optional()
        .describe('Enable test mode (no signature requests consumed)'),
      clientId: z
        .string()
        .optional()
        .describe('API App client ID for branding and embedded flows')
    })
  )
  .output(
    z.object({
      signatureRequestId: z
        .string()
        .describe('Unique identifier of the created signature request'),
      title: z.string().optional().describe('Title of the signature request'),
      subject: z.string().optional().describe('Subject of the signature request'),
      isComplete: z.boolean().describe('Whether all signers have completed signing'),
      signingUrl: z.string().optional().describe('URL where signers can sign the document'),
      detailsUrl: z
        .string()
        .optional()
        .describe('URL to view the request details on Dropbox Sign'),
      requesterEmailAddress: z.string().optional().describe('Email address of the requester'),
      signatures: z
        .array(
          z.object({
            signatureId: z.string().describe('Unique identifier of this signature'),
            signerEmailAddress: z.string().describe('Email address of the signer'),
            signerName: z.string().describe('Name of the signer'),
            statusCode: z
              .string()
              .describe('Current status (e.g. awaiting_signature, signed, declined)'),
            order: z.number().optional().describe('Signing order')
          })
        )
        .describe('List of signatures and their statuses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result = await client.sendSignatureRequest({
      title: ctx.input.title,
      subject: ctx.input.subject,
      message: ctx.input.message,
      signers: ctx.input.signers,
      fileUrls: ctx.input.fileUrls,
      ccEmailAddresses: ctx.input.ccEmailAddresses,
      metadata: ctx.input.metadata,
      allowDecline: ctx.input.allowDecline,
      allowReassign: ctx.input.allowReassign,
      useTextTags: ctx.input.useTextTags,
      signingRedirectUrl: ctx.input.signingRedirectUrl,
      testMode: ctx.input.testMode,
      clientId: ctx.input.clientId
    });

    let signatures = (result.signatures || []).map((s: any) => ({
      signatureId: s.signature_id,
      signerEmailAddress: s.signer_email_address,
      signerName: s.signer_name,
      statusCode: s.status_code,
      order: s.order
    }));

    let signerNames = signatures.map((s: any) => s.signerName).join(', ');

    return {
      output: {
        signatureRequestId: result.signature_request_id,
        title: result.title,
        subject: result.subject,
        isComplete: result.is_complete,
        signingUrl: result.signing_url,
        detailsUrl: result.details_url,
        requesterEmailAddress: result.requester_email_address,
        signatures
      },
      message: `Signature request **"${result.title || result.subject || result.signature_request_id}"** sent to ${signerNames}.`
    };
  })
  .build();
