import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createSignPathClient } from '../lib/client';
import { spec } from '../spec';

export let approveDenySigningRequest = SlateTool.create(spec, {
  name: 'Approve or Deny Signing Request',
  key: 'approve_deny_signing_request',
  description: `Approve or deny a signing request that is waiting for approval. This is typically used for release-signing workflows that require manual approval before processing. The signing request must be in the **WaitingForApproval** status.`,
  instructions: [
    'The signing request must be in WaitingForApproval status before it can be approved or denied.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      signingRequestId: z.string().describe('ID of the signing request to approve or deny'),
      denyReason: z
        .string()
        .max(5000)
        .optional()
        .describe('Optional reason when action is deny'),
      action: z
        .enum(['approve', 'deny'])
        .describe('Whether to approve or deny the signing request')
    })
  )
  .output(
    z.object({
      signingRequestId: z
        .string()
        .describe('ID of the signing request that was approved or denied'),
      denyReason: z
        .string()
        .max(5000)
        .optional()
        .describe('Optional reason when action is deny'),
      action: z.string().describe('Action that was performed (approve or deny)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSignPathClient(ctx);

    if (ctx.input.action === 'approve' && ctx.input.denyReason !== undefined) {
      throw createApiServiceError('denyReason can only be used when action is deny.');
    }
    if (ctx.input.action === 'approve') {
      await client.approveSigningRequest(ctx.input.signingRequestId);
    } else {
      await client.denySigningRequest(ctx.input.signingRequestId, ctx.input.denyReason);
    }

    return {
      output: {
        signingRequestId: ctx.input.signingRequestId,
        action: ctx.input.action
      },
      message: `Signing request **${ctx.input.signingRequestId}** has been **${ctx.input.action === 'approve' ? 'approved' : 'denied'}**.`
    };
  })
  .build();
