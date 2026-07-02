import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDidcommConnection = SlateTool.create(spec, {
  name: 'Manage DIDComm Connection',
  key: 'manage_didcomm_connection',
  description: `Create DIDComm invitations, receive invitations, or update existing connections. DIDComm connections enable secure messaging and credential exchange between parties. Invitations can be single-use or reusable.`,
  instructions: [
    'Use action "create_invitation" to create a new invitation URI/QR code.',
    'Use action "receive_invitation" to accept an invitation from another party.',
    'Use action "update" to update the display name of an existing connection.'
  ]
})
  .input(
    z.object({
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
      projectId: ctx.config.projectId
    });

    if (ctx.input.action === 'create_invitation') {
      let result = await client.createDidcommInvitation({
        reusable: ctx.input.reusable,
        did: ctx.input.did,
        goal: ctx.input.goal
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
      let data = result.data ?? result;
      return {
        output: {
          connectionId: data.id ?? data.connectionId,
          status: data.status,
          displayName: data.displayName,
          ourDid: data.ourDid,
          theirDid: data.theirDid
        },
        message: `Received DIDComm invitation. Connection status: **${data.status}**.`
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
        displayName: data.displayName,
        ourDid: data.ourDid,
        theirDid: data.theirDid
      },
      message: `Updated DIDComm connection \`${data.id}\` display name to "${ctx.input.displayName}".`
    };
  })
  .build();
