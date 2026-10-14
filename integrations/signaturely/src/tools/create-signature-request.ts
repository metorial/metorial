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
    'Call list_templates to discover template IDs and signer roles.',
    'Use fields for text API tags and checkboxFields for boolean checkbox API tags.',
    'Set testMode to true to request test mode.'
  ],
  constraints: ['Signature request quotas depend on the connected account API plan.'],
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
              .describe(
                'Key-value pairs mapping text template field tags to pre-filled values'
              ),
            checkboxFields: z
              .record(z.string(), z.boolean())
              .optional()
              .describe(
                'Key-value pairs mapping checkbox template field tags to true or false; do not duplicate tags in fields'
              )
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
      testMode: z.boolean().optional().describe('When true, requests a test signature request')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('ID of the created signature request'),
      title: z.string().optional().describe('Title of the signature request'),
      status: z.string().optional().describe('Document state returned by Signaturely'),
      createdAt: z.string().optional().describe('Document creation timestamp'),
      testMode: z.boolean().optional().describe('Test mode flag returned by Signaturely')
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

    let requestId = result.id;
    let title = result.title ?? ctx.input.title;

    return {
      output: {
        requestId,
        title,
        status: result.status ?? undefined,
        createdAt: result.createdAt ?? undefined,
        testMode: result.testMode ?? undefined
      },
      message: `Created signature request${title ? ` "${title}"` : ''} (ID: ${requestId}) for ${ctx.input.signers.length} signer(s)${result.status ? ` with status "${result.status}"` : ''}.`
    };
  })
  .build();
