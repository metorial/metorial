import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateAutologinUrl = SlateTool.create(spec, {
  name: 'Generate Auto-Login URL',
  key: 'generate_autologin_url',
  instructions: [
    'The provider documents nickname as a request field; provide it when generating a hash.'
  ],
  description: `Generates an auto-login hash for a conference room and participant role. Combine the returned autologin_hash with room_url from get_conference as room_url?l=autologin_hash to create a direct join URL.`
})
  .input(
    z.object({
      roomId: z.string().describe('ID of the conference room'),
      email: z.string().describe('Email address of the participant'),
      nickname: z.string().optional().describe('Display name for the participant'),
      role: z
        .enum(['1', '2', '3', 'listener', 'moderator', 'guest_speaker', 'presenter', 'host'])
        .describe('Participant role. Legacy values 1, 2, 3 map to listener, presenter, host'),
      password: z.string().optional().describe('Room password for password-protected rooms'),
      token: z.string().optional().describe('Access token for token-protected rooms')
    })
  )
  .output(
    z.object({
      autologinUrl: z.record(z.string(), z.unknown()).describe('Auto-login URL details')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.nickname) {
      throw createApiServiceError(
        'nickname is required by ClickMeeting when generating an auto-login hash.'
      );
    }
    let client = new Client({ token: ctx.auth.token });
    let result = await client.generateAutologinHash(ctx.input.roomId, {
      email: ctx.input.email,
      nickname: ctx.input.nickname,
      role:
        ({ '1': 'listener', '2': 'presenter', '3': 'host' } as Record<string, string>)[
          ctx.input.role
        ] ?? ctx.input.role,
      password: ctx.input.password,
      token: ctx.input.token
    });

    return {
      output: { autologinUrl: result },
      message: `Generated auto-login URL for **${ctx.input.email}** (role: ${ctx.input.role}) for room ${ctx.input.roomId}.`
    };
  })
  .build();
