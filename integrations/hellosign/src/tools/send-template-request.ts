import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendTemplateRequest = SlateTool.create(spec, {
  name: 'Send Template Signature Request',
  key: 'send_template_request',
  description: `Send a signature request based on one or more existing templates. Templates define the document layout, signer roles, and form fields. You assign actual signers to the template roles and optionally pre-fill custom fields.`,
  instructions: [
    'Signer roles must match the roles defined in the template.',
    'Custom field names must match the merge fields defined in the template.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateIds: z.array(z.string()).min(1).describe('IDs of the templates to use'),
      title: z.string().optional().describe('Title for the signature request'),
      subject: z.string().optional().describe('Subject line of the email'),
      message: z.string().optional().describe('Message body of the email'),
      signers: z
        .array(
          z.object({
            role: z.string().describe('Template signer role name to assign this signer to'),
            name: z.string().describe('Full name of the signer'),
            emailAddress: z.string().describe('Email address of the signer'),
            pin: z.string().optional().describe('Access code for the signer')
          })
        )
        .min(1)
        .describe('Signers mapped to template roles'),
      ccs: z
        .array(
          z.object({
            role: z.string().describe('Template CC role name'),
            emailAddress: z.string().describe('Email address of the CC recipient')
          })
        )
        .optional()
        .describe('CC recipients mapped to template CC roles'),
      customFields: z
        .array(
          z.object({
            name: z.string().describe('Name of the template merge field'),
            value: z.string().describe('Value to pre-fill')
          })
        )
        .optional()
        .describe('Pre-filled values for template merge fields'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value metadata pairs'),
      signingRedirectUrl: z
        .string()
        .optional()
        .describe('URL to redirect signers to after signing'),
      testMode: z.boolean().optional().describe('Enable test mode'),
      clientId: z.string().optional().describe('API App client ID')
    })
  )
  .output(
    z.object({
      signatureRequestId: z
        .string()
        .describe('Unique identifier of the created signature request'),
      title: z.string().optional().describe('Title of the signature request'),
      isComplete: z.boolean().describe('Whether all signers have completed signing'),
      detailsUrl: z.string().optional().describe('URL to view request details'),
      signatures: z
        .array(
          z.object({
            signatureId: z.string().describe('Unique identifier of this signature'),
            signerEmailAddress: z.string().describe('Email address of the signer'),
            signerName: z.string().describe('Name of the signer'),
            signerRole: z
              .string()
              .optional()
              .describe('Template role assigned to this signer'),
            statusCode: z.string().describe('Current status')
          })
        )
        .describe('List of signatures')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result = await client.sendSignatureRequestWithTemplate({
      templateIds: ctx.input.templateIds,
      title: ctx.input.title,
      subject: ctx.input.subject,
      message: ctx.input.message,
      signers: ctx.input.signers,
      ccs: ctx.input.ccs,
      customFields: ctx.input.customFields,
      metadata: ctx.input.metadata,
      signingRedirectUrl: ctx.input.signingRedirectUrl,
      testMode: ctx.input.testMode,
      clientId: ctx.input.clientId
    });

    let signatures = (result.signatures || []).map((s: any) => ({
      signatureId: s.signature_id,
      signerEmailAddress: s.signer_email_address,
      signerName: s.signer_name,
      signerRole: s.signer_role,
      statusCode: s.status_code
    }));

    return {
      output: {
        signatureRequestId: result.signature_request_id,
        title: result.title,
        isComplete: result.is_complete,
        detailsUrl: result.details_url,
        signatures
      },
      message: `Template-based signature request **"${result.title || result.signature_request_id}"** sent to ${signatures.length} signer(s).`
    };
  })
  .build();
