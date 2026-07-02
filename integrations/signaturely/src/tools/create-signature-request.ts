import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSignatureRequest = SlateTool.create(spec, {
  name: 'Create Signature Request',
  key: 'create_signature_request',
  description: `Creates a new electronic signature request based on an existing template. Sends the document to one or more signers for signature.
Templates must be created in the Signaturely dashboard beforehand. Each signer must be assigned a role matching the template's configured roles.
Optionally supports ordered signing, custom titles/messages, and test mode for validation.`,
  instructions: [
    'The templateId must reference a template that has already been created in the Signaturely dashboard.',
    'Each signer\'s role must match one of the roles defined in the template (e.g., "Receiving Party", "Disclosing Party").',
    'Use the signer fields property to pre-fill tagged fields in the template (e.g., {"RecievingP_FullName_1": "John Doe"}).',
    'Set testMode to true for testing without consuming signature request quota.'
  ],
  constraints: [
    'The number of signature requests allowed per month depends on your API plan (50, 150, or 500).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z
        .string()
        .describe('ID of the Signaturely template to use for the signature request'),
      signers: z
        .array(
          z.object({
            name: z.string().describe('Full name of the signer'),
            email: z.string().describe('Email address of the signer'),
            role: z
              .string()
              .describe(
                'Role assigned to this signer, must match a role defined in the template'
              ),
            order: z
              .number()
              .optional()
              .describe('Signing order for this signer (used when isOrdered is true)'),
            fields: z
              .record(z.string(), z.string())
              .optional()
              .describe('Key-value pairs mapping template field tags to pre-filled values')
          })
        )
        .describe('List of signers who need to sign the document'),
      title: z.string().optional().describe('Custom title for the signature request document'),
      message: z
        .string()
        .optional()
        .describe('Custom message included in the signing invitation email'),
      isOrdered: z
        .boolean()
        .optional()
        .describe('Whether signers must sign in a specific order'),
      testMode: z
        .boolean()
        .optional()
        .describe(
          'When true, creates a test signature request that does not count against your quota'
        )
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('ID of the created signature request'),
      title: z.string().optional().describe('Title of the signature request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info({
      message: 'Creating signature request from template',
      templateId: ctx.input.templateId
    });

    let result = await client.createSignatureRequest({
      templateId: ctx.input.templateId,
      signers: ctx.input.signers,
      title: ctx.input.title,
      message: ctx.input.message,
      isOrdered: ctx.input.isOrdered,
      testMode: ctx.input.testMode
    });

    let requestId = result.id?.toString() || result.documentId?.toString() || '';
    let title = result.title || ctx.input.title || '';

    return {
      output: {
        requestId,
        title
      },
      message: `Successfully created signature request${title ? ` "${title}"` : ''} (ID: ${requestId}) and sent to ${ctx.input.signers.length} signer(s).`
    };
  })
  .build();
