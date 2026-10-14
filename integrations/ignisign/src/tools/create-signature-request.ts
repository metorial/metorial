import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let createSignatureRequest = SlateTool.create(spec, {
  name: 'Create Signature Request',
  key: 'create_signature_request',
  description: `Initialize a new signature request, optionally configure it with documents, signers, and metadata, then publish it for signing. Supports the full lifecycle: init → update → publish in a single call, or just initialization for later configuration.`,
  instructions: [
    'Provide a signatureProfileId to associate the request with a specific signature profile.',
    'To publish immediately, provide at least documentIds and signerIds.',
    'If publish is false or not set, the request remains in DRAFT and can be updated later.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      signatureProfileId: z
        .string()
        .optional()
        .describe('Signature profile ID to use for this request'),
      title: z.string().optional().describe('Title of the signature request'),
      description: z.string().optional().describe('Description of the signature request'),
      externalId: z
        .string()
        .optional()
        .describe('External ID for correlating with your system'),
      documentIds: z
        .array(z.string())
        .optional()
        .describe('Document IDs to include in this request'),
      signerIds: z.array(z.string()).optional().describe('Signer IDs who should sign'),
      language: z
        .string()
        .optional()
        .describe('Language code for the signature session (e.g., EN, FR, DE)'),
      expirationDate: z.string().optional().describe('Expiration date in ISO 8601 format'),
      expirationDateIsActivated: z
        .boolean()
        .optional()
        .describe('Whether expiration is active'),
      publish: z
        .boolean()
        .optional()
        .describe('If true, publish the request immediately after setup')
    })
  )
  .output(
    z.object({
      signatureRequestId: z.string().describe('ID of the created signature request'),
      status: z.string().optional().describe('Current status of the signature request'),
      context: z
        .any()
        .optional()
        .describe('Full context of the signature request after update/publish')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.auth.appId ?? ctx.config.appId,
      appEnv: ctx.auth.appEnv ?? ctx.config.appEnv
    });

    let initResult = await client.initSignatureRequest(ctx.input.signatureProfileId);
    let signatureRequestId = initResult.signatureRequestId;
    if (!signatureRequestId)
      throw createApiServiceError('IgniSign did not return a signature request ID.');

    let hasUpdateData = [
      ctx.input.title,
      ctx.input.description,
      ctx.input.externalId,
      ctx.input.documentIds,
      ctx.input.signerIds,
      ctx.input.language,
      ctx.input.expirationDate,
      ctx.input.expirationDateIsActivated
    ].some(value => value !== undefined);

    let context: any;

    if (hasUpdateData) {
      let updateData = pickDefined({
        title: ctx.input.title,
        description: ctx.input.description,
        externalId: ctx.input.externalId,
        documentIds: ctx.input.documentIds,
        signerIds: ctx.input.signerIds,
        language: ctx.input.language,
        expirationDate: ctx.input.expirationDate,
        expirationDateIsActivated: ctx.input.expirationDateIsActivated
      });

      context = await client.updateSignatureRequest(signatureRequestId, updateData);
    }

    let status: string | undefined;

    if (ctx.input.publish) {
      await client.publishSignatureRequest(signatureRequestId);
    }

    context = await client.getSignatureRequestContext(signatureRequestId);
    status = context.status;

    return {
      output: {
        signatureRequestId,
        status,
        context
      },
      message: ctx.input.publish
        ? `Signature request **${signatureRequestId}** created and published.`
        : `Signature request **${signatureRequestId}** initialized${hasUpdateData ? ' and configured' : ''}.`
    };
  })
  .build();
