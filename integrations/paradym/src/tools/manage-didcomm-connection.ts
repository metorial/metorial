import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageDidcommConnection = SlateTool.create(spec, {
  name: 'Manage DIDComm Connection',
  key: 'manage_didcomm_connection',
  description: `Create DIDComm invitations, receive invitations, or update existing connections. DIDComm connections enable secure messaging and credential exchange between parties. Invitations can be single-use or reusable.`,
  instructions: [
    'Call list_projects to choose the projectId for this operation.',
    'Use action "create_invitation" to create a new invitation URI/QR code.',
    'Use action "receive_invitation" to accept an invitation from another party.',
    'Use action "update" to update the display name of an existing connection.'
  ]
})
  .input(
    z.object({
      projectId: projectIdSchema,
      action: z
        .enum(['create_invitation', 'receive_invitation', 'update'])
        .describe('Action to perform'),
      reusable: z
        .boolean()
        .optional()
        .describe('Whether the invitation can be used multiple times (create_invitation)'),
      did: z.string().optional().describe('DID to use for the invitation (create_invitation)'),
      goal: z
        .string()
        .optional()
        .describe('Goal description for the invitation (create_invitation)'),
      goalCode: z
        .string()
        .optional()
        .describe('Machine-readable goal code for create_invitation, e.g. p2p-messaging'),
      invitationUri: z
        .string()
        .optional()
        .describe('Invitation URI to accept (receive_invitation)'),
      displayName: z
        .string()
        .optional()
        .describe('Display name for the connection (receive_invitation, update)'),
      connectionId: z.string().optional().describe('Connection ID to update (update)')
    })
  )
  .output(
    z.object({
      connectionId: z.string().optional().describe('ID of the connection'),
      invitationId: z.string().optional().describe('ID of the created invitation'),
      invitationUri: z.string().optional().describe('URI for the invitation'),
      status: z.string().optional().describe('Status of the connection or invitation'),
      displayName: z.string().optional().describe('Display name of the connection'),
      ourDid: z.string().optional().describe('Our DID in the connection'),
      theirDid: z.string().optional().describe('Their DID in the connection')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.input.projectId ?? ctx.config.projectId
    });

    if (ctx.input.action === 'receive_invitation' && !ctx.input.invitationUri?.trim()) {
      throw createApiServiceError('invitationUri is required to receive an invitation.');
    }
    if (
      ctx.input.action === 'update' &&
      (!ctx.input.connectionId?.trim() || !ctx.input.displayName?.trim())
    ) {
      throw createApiServiceError(
        'connectionId and displayName are required to update a connection.'
      );
    }
    if (
      ctx.input.action === 'create_invitation' &&
      ctx.input.goalCode &&
      !ctx.input.goal?.trim()
    ) {
      throw createApiServiceError('goal is required when supplying goalCode.');
    }
    if (ctx.input.action === 'create_invitation') {
      let result = await client.createDidcommInvitation({
        reusable: ctx.input.reusable,
        did: ctx.input.did,
        goal: ctx.input.goal
          ? { description: ctx.input.goal, code: ctx.input.goalCode }
          : undefined
      });
      let data = result.data ?? result;
      return {
        output: {
          invitationId: data.id,
          invitationUri: data.invitationUri,
          status: data.status
        },
        message: `Created DIDComm invitation \`${data.id}\`.${data.invitationUri ? ' Share the invitation URI with the other party.' : ''}`
      };
    }

    if (ctx.input.action === 'receive_invitation') {
      let result = await client.receiveDidcommInvitation({
        didcommInvitation: ctx.input.invitationUri!,
        displayName: ctx.input.displayName
      });
      let data =
        result.didcommConnection ?? result.data?.didcommConnection ?? result.data ?? result;
      return {
        output: {
          connectionId: data.id ?? data.connectionId,
          status: data.status,
          displayName: data.displayName ?? undefined,
          ourDid: data.ourDid,
          theirDid: data.theirDid
        },
        message: `Received DIDComm invitation. Connection ID: \`${data.id}\`.`
      };
    }

    // update
    let result = await client.updateDidcommConnection(ctx.input.connectionId!, {
      displayName: ctx.input.displayName!
    });
    let data = result.data ?? result;
    return {
      output: {
        connectionId: data.id,
        displayName: data.displayName ?? undefined,
        ourDid: data.ourDid,
        theirDid: data.theirDid
      },
      message: `Updated DIDComm connection \`${data.id}\` display name to "${ctx.input.displayName}".`
    };
  })
  .build();
