import { isIP } from 'node:net';
import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { gameClient } from '../lib/client';
import { epicError, identifier, identifiers } from '../lib/validation';
import { spec } from '../spec';

let participantTokenSchema = z.object({
  productUserId: z.string().describe('Participant Product User ID'),
  token: z.string().describe('Voice room access token for this participant'),
  hardMuted: z.boolean().describe('Whether the participant is hard-muted')
});

export let manageVoiceRoom = SlateTool.create(spec, {
  name: 'Manage Voice Room',
  key: 'manage_voice_room',
  description: `Manage voice chat rooms for your game. Supports three operations:
- **join**: Generate per-player room tokens for a trusted game backend; deliver each only to its corresponding player
- **remove**: Remove a participant from a voice room
- **mute**: Hard-mute or unmute a participant in a voice room`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      operation: z.enum(['join', 'remove', 'mute']).describe('The operation to perform'),
      roomId: z.string().describe('Voice room identifier'),
      participants: z
        .array(
          z.object({
            productUserId: z.string().describe('Participant Product User ID'),
            clientIp: z.string().optional().describe('Client IP address (for join)'),
            hardMuted: z
              .boolean()
              .optional()
              .describe(
                'Whether to hard-mute (for join and mute). Mute defaults to true when omitted.'
              )
          })
        )
        .min(1)
        .describe('Participants to manage')
    })
  )
  .output(
    z.object({
      roomId: z.string().optional().describe('Voice room ID'),
      participantTokens: z
        .array(participantTokenSchema)
        .optional()
        .describe('Generated room tokens for joined participants'),
      clientBaseUrl: z.string().optional().describe('Media server base URL'),
      completedParticipants: z
        .array(z.string())
        .optional()
        .describe('Participants with successful native receipts.'),
      remainingParticipants: z
        .array(z.string())
        .optional()
        .describe('Failed or unattempted participants; failed effects may be uncertain.'),
      outcome: z
        .enum(['accepted', 'partial'])
        .optional()
        .describe('Native acceptance or a partially completed multi-request operation.'),
      failure: z
        .string()
        .optional()
        .describe('Safe reconciliation guidance for a partial operation.'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    identifier(ctx.input.roomId, 'Room ID');
    identifiers(
      ctx.input.participants.map(row => row.productUserId),
      100,
      'Participants'
    );
    for (const row of ctx.input.participants) {
      if (
        row.clientIp !== undefined &&
        (ctx.input.operation !== 'join' || !isIP(row.clientIp))
      )
        throw createApiServiceError(
          'clientIp requires a valid IP address and applies only to join.'
        );
      if (ctx.input.operation === 'remove' && row.hardMuted !== undefined)
        throw createApiServiceError('hardMuted does not apply to removal.');
    }
    const client = gameClient(ctx);
    if (ctx.input.operation === 'join') {
      const data = await client.createVoiceRoomTokens(
        ctx.input.roomId,
        ctx.input.participants.map(row => ({
          puid: row.productUserId,
          clientIp: row.clientIp,
          hardMuted: row.hardMuted
        }))
      );
      return {
        output: {
          roomId: data.roomId,
          participantTokens: data.participants.map(row => ({
            productUserId: row.puid,
            token: row.token,
            hardMuted: row.hardMuted
          })),
          clientBaseUrl: data.clientBaseUrl,
          success: true,
          outcome: 'accepted' as const
        },
        message:
          'Created the exact participant room tokens. Deliver each token only to its matching player; never share tokens with the group. Token issuance does not prove anyone joined.'
      };
    }
    const completed: string[] = [];
    for (const participant of ctx.input.participants) {
      try {
        if (ctx.input.operation === 'remove')
          await client.removeVoiceParticipant(ctx.input.roomId, participant.productUserId);
        else
          await client.modifyVoiceParticipant(
            ctx.input.roomId,
            participant.productUserId,
            participant.hardMuted ?? true
          );
        completed.push(participant.productUserId);
      } catch (error) {
        const safe = epicError(error, true);
        return {
          output: {
            roomId: ctx.input.roomId,
            success: false,
            outcome: 'partial' as const,
            completedParticipants: completed,
            remainingParticipants: ctx.input.participants
              .slice(completed.length)
              .map(row => row.productUserId),
            failure: safe.message
          },
          message:
            'The participant operation stopped after a failed request. Earlier native receipts remain effective; reconcile the failed participant before retrying. No rollback occurred.'
        };
      }
    }
    return {
      output: {
        roomId: ctx.input.roomId,
        success: true,
        outcome: 'accepted' as const,
        completedParticipants: completed,
        remainingParticipants: []
      },
      message:
        'Epic accepted each participant operation. The API does not expose a complete room-membership observer.'
    };
  })
  .build();
