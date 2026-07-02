import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { hellosignServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageSignatureRequest = SlateTool.create(spec, {
  name: 'Manage Signature Request',
  key: 'manage_signature_request',
  description: `Perform actions on an existing signature request: cancel it, release an on-hold request, remove your access, send a reminder to a signer, or update signer details. Combine related management actions into a single call.`,
  instructions: [
    'Use action "cancel" to permanently cancel an incomplete request.',
    'Use action "release_hold" to send a prepared/on-hold signature request.',
    'Use action "remove" to remove your access to a completed request (irreversible).',
    'Use action "remind" to send a reminder to a specific signer by email.',
    'Use action "update" to change a signer\'s email, name, or the request expiration.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      signatureRequestId: z.string().describe('ID of the signature request'),
      action: z
        .enum(['cancel', 'release_hold', 'remove', 'remind', 'update'])
        .describe('Action to perform'),
      reminderEmailAddress: z
        .string()
        .optional()
        .describe('Email address of the signer to remind (required for "remind" action)'),
      reminderName: z.string().optional().describe('Name of the signer to remind'),
      signatureId: z
        .string()
        .optional()
        .describe('Signature ID to update (for "update" action)'),
      newEmailAddress: z
        .string()
        .optional()
        .describe('New email address for the signer (for "update" action)'),
      newSignerName: z
        .string()
        .optional()
        .describe('New name for the signer (for "update" action)'),
      expiresAt: z
        .number()
        .optional()
        .describe('New expiration Unix timestamp (for "update" action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      signatureRequestId: z.string().describe('ID of the affected signature request'),
      action: z.string().describe('Action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let { signatureRequestId, action } = ctx.input;

    switch (action) {
      case 'cancel':
        await client.cancelSignatureRequest(signatureRequestId);
        break;

      case 'release_hold':
        await client.releaseOnHoldSignatureRequest(signatureRequestId);
        break;

      case 'remove':
        await client.removeSignatureRequest(signatureRequestId);
        break;

      case 'remind':
        if (!ctx.input.reminderEmailAddress) {
          throw hellosignServiceError(
            'reminderEmailAddress is required for the "remind" action.'
          );
        }
        await client.sendReminder(
          signatureRequestId,
          ctx.input.reminderEmailAddress,
          ctx.input.reminderName
        );
        break;

      case 'update':
        if (
          !ctx.input.signatureId &&
          !ctx.input.newEmailAddress &&
          !ctx.input.newSignerName &&
          ctx.input.expiresAt === undefined
        ) {
          throw hellosignServiceError(
            'Provide signatureId, newEmailAddress, newSignerName, or expiresAt for the "update" action.'
          );
        }
        await client.updateSignatureRequest({
          signatureRequestId,
          signatureId: ctx.input.signatureId,
          emailAddress: ctx.input.newEmailAddress,
          signerName: ctx.input.newSignerName,
          expiresAt: ctx.input.expiresAt
        });
        break;
    }

    let actionLabels: Record<string, string> = {
      cancel: 'canceled',
      release_hold: 'released from hold',
      remove: 'removed',
      remind: 'reminder sent',
      update: 'updated'
    };

    return {
      output: {
        success: true,
        signatureRequestId,
        action
      },
      message: `Signature request **${signatureRequestId}** — ${actionLabels[action]}.`
    };
  })
  .build();
