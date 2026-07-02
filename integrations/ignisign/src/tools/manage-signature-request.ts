import { SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let manageSignatureRequest = SlateTool.create(spec, {
  name: 'Manage Signature Request',
  key: 'manage_signature_request',
  description: `Update, publish, or close an existing signature request. Use this to modify a draft request's configuration, launch it for signing, or close a completed/cancelled request.`,
  instructions: [
    'Use action "update" to modify a DRAFT signature request.',
    'Use action "publish" to launch a signature request for signing (requires documents and signers).',
    'Use action "close" to close/cancel a signature request.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      signatureRequestId: z.string().describe('ID of the signature request'),
      action: z
        .enum(['update', 'publish', 'close'])
        .describe('Action to perform on the signature request'),
      title: z.string().optional().describe('Updated title (for update action)'),
      description: z.string().optional().describe('Updated description (for update action)'),
      externalId: z.string().optional().describe('External ID (for update action)'),
      documentIds: z
        .array(z.string())
        .optional()
        .describe('Document IDs to assign (for update action)'),
      signerIds: z
        .array(z.string())
        .optional()
        .describe('Signer IDs to assign (for update action)'),
      language: z.string().optional().describe('Language code (for update action)'),
      expirationDate: z
        .string()
        .optional()
        .describe('Expiration date in ISO 8601 format (for update action)'),
      expirationDateIsActivated: z
        .boolean()
        .optional()
        .describe('Whether expiration is active (for update action)')
    })
  )
  .output(
    z.object({
      signatureRequestId: z.string().describe('ID of the signature request'),
      action: z.string().describe('Action that was performed'),
      result: z.any().optional().describe('Result from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.config.appId,
      appEnv: ctx.config.appEnv
    });

    let result: any;

    if (ctx.input.action === 'update') {
      let updateData: Record<string, any> = {};
      if (ctx.input.title) updateData.title = ctx.input.title;
      if (ctx.input.description) updateData.description = ctx.input.description;
      if (ctx.input.externalId) updateData.externalId = ctx.input.externalId;
      if (ctx.input.documentIds) updateData.documentIds = ctx.input.documentIds;
      if (ctx.input.signerIds) updateData.signerIds = ctx.input.signerIds;
      if (ctx.input.language) updateData.language = ctx.input.language;
      if (ctx.input.expirationDate) updateData.expirationDate = ctx.input.expirationDate;
      if (ctx.input.expirationDateIsActivated !== undefined)
        updateData.expirationDateIsActivated = ctx.input.expirationDateIsActivated;

      result = await client.updateSignatureRequest(ctx.input.signatureRequestId, updateData);
    } else if (ctx.input.action === 'publish') {
      result = await client.publishSignatureRequest(ctx.input.signatureRequestId);
    } else {
      result = await client.closeSignatureRequest(ctx.input.signatureRequestId);
    }

    return {
      output: {
        signatureRequestId: ctx.input.signatureRequestId,
        action: ctx.input.action,
        result
      },
      message: `Signature request **${ctx.input.signatureRequestId}** successfully **${ctx.input.action === 'update' ? 'updated' : ctx.input.action === 'publish' ? 'published' : 'closed'}**.`
    };
  })
  .build();
