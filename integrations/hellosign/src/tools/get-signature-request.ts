import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let signatureSchema = z.object({
  signatureId: z.string().describe('Unique ID of this signature'),
  signerEmailAddress: z.string().describe('Signer email address'),
  signerName: z.string().describe('Signer name'),
  signerRole: z.string().optional().describe('Template role if from a template'),
  order: z.number().optional().describe('Signing order'),
  statusCode: z.string().describe('Status: awaiting_signature, signed, declined, etc.'),
  signedAt: z.string().optional().describe('Timestamp when the signer signed (ISO 8601)'),
  lastViewedAt: z.string().optional().describe('Timestamp when the signer last viewed'),
  lastRemindedAt: z.string().optional().describe('Timestamp of last reminder sent'),
  hasPin: z.boolean().describe('Whether PIN is required'),
  hasSmsAuth: z.boolean().describe('Whether SMS authentication is enabled')
});

export let getSignatureRequest = SlateTool.create(spec, {
  name: 'Get Signature Request',
  key: 'get_signature_request',
  description: `Retrieve the full details and current status of a signature request, including all signer statuses, response data, custom fields, and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      signatureRequestId: z.string().describe('ID of the signature request to retrieve')
    })
  )
  .output(
    z.object({
      signatureRequestId: z.string().describe('Unique identifier'),
      title: z.string().optional().describe('Title of the request'),
      subject: z.string().optional().describe('Email subject'),
      message: z.string().optional().describe('Email message body'),
      isComplete: z.boolean().describe('Whether all signers have completed'),
      isDeclined: z.boolean().describe('Whether any signer has declined'),
      hasError: z.boolean().describe('Whether there are any errors'),
      createdAt: z.string().optional().describe('Creation timestamp (ISO 8601)'),
      signingUrl: z.string().optional().describe('Signing URL'),
      detailsUrl: z.string().optional().describe('Details page URL'),
      requesterEmailAddress: z.string().optional().describe('Requester email'),
      metadata: z.record(z.string(), z.string()).optional().describe('Associated metadata'),
      signatures: z.array(signatureSchema).describe('Signer details and statuses'),
      responseData: z
        .array(
          z.object({
            apiId: z.string().optional().describe('API ID of the form field'),
            signatureId: z.string().optional().describe('Signature ID that filled this field'),
            name: z.string().optional().describe('Field name'),
            value: z.string().optional().describe('Field value'),
            type: z.string().optional().describe('Field type')
          })
        )
        .optional()
        .describe('Completed form field responses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result = await client.getSignatureRequest(ctx.input.signatureRequestId);

    let signatures = (result.signatures || []).map((s: any) => ({
      signatureId: s.signature_id,
      signerEmailAddress: s.signer_email_address,
      signerName: s.signer_name,
      signerRole: s.signer_role || undefined,
      order: s.order,
      statusCode: s.status_code,
      signedAt: s.signed_at ? new Date(s.signed_at * 1000).toISOString() : undefined,
      lastViewedAt: s.last_viewed_at
        ? new Date(s.last_viewed_at * 1000).toISOString()
        : undefined,
      lastRemindedAt: s.last_reminded_at
        ? new Date(s.last_reminded_at * 1000).toISOString()
        : undefined,
      hasPin: s.has_pin ?? false,
      hasSmsAuth: s.has_sms_auth ?? false
    }));

    let responseData = (result.response_data || []).map((r: any) => ({
      apiId: r.api_id,
      signatureId: r.signature_id,
      name: r.name,
      value: r.value,
      type: r.type
    }));

    let statusSummary = signatures
      .map((s: any) => `${s.signerName}: ${s.statusCode}`)
      .join(', ');

    return {
      output: {
        signatureRequestId: result.signature_request_id,
        title: result.title,
        subject: result.subject,
        message: result.message,
        isComplete: result.is_complete,
        isDeclined: result.is_declined,
        hasError: result.has_error,
        createdAt: result.created_at
          ? new Date(result.created_at * 1000).toISOString()
          : undefined,
        signingUrl: result.signing_url || undefined,
        detailsUrl: result.details_url || undefined,
        requesterEmailAddress: result.requester_email_address,
        metadata: result.metadata,
        signatures,
        responseData
      },
      message: `Signature request **"${result.title || result.signature_request_id}"** — ${result.is_complete ? 'Complete' : 'In progress'}. Signers: ${statusSummary}`
    };
  })
  .build();
