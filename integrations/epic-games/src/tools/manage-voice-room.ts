import { SlateTool } from 'slates';
import { z } from 'zod';
import { EosGameServicesClient } from '../lib/client';
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
- **join**: Generate room tokens for participants to join a voice room
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
              .describe('Whether to hard-mute (for join and mute)')
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
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EosGameServicesClient({
      token: ctx.auth.token,
      deploymentId: ctx.config.deploymentId
    });

    if (ctx.input.operation === 'join') {
      let data = await client.createVoiceRoomTokens(
        ctx.input.roomId,
        ctx.input.participants.map(p => ({
          puid: p.productUserId,
          clientIp: p.clientIp,
          hardMuted: p.hardMuted
        }))
      );

      let participantTokens = (data.participants ?? []).map((p: any) => ({
        productUserId: p.puid,
        token: p.token,
        hardMuted: p.hardMuted ?? false
      }));

      return {
        output: {
          roomId: data.roomId,
          participantTokens,
          clientBaseUrl: data.clientBaseUrl,
          success: true
        },
        message: `Generated voice room tokens for **${participantTokens.length}** participant(s) in room \`${ctx.input.roomId}\`.`
      };
    }

    if (ctx.input.operation === 'remove') {
      for (let participant of ctx.input.participants) {
        await client.removeVoiceParticipant(ctx.input.roomId, participant.productUserId);
      }
      return {
        output: { success: true },
        message: `Removed **${ctx.input.participants.length}** participant(s) from voice room \`${ctx.input.roomId}\`.`
      };
    }

    // mute operation
    for (let participant of ctx.input.participants) {
      await client.modifyVoiceParticipant(
        ctx.input.roomId,
        participant.productUserId,
        participant.hardMuted ?? true
      );
    }
    return {
      output: { success: true },
      message: `Updated mute status for **${ctx.input.participants.length}** participant(s) in voice room \`${ctx.input.roomId}\`.`
    };
  })
  .build();
