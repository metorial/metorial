import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateAutologinUrl = SlateTool.create(spec, {
  name: 'Generate Auto-Login URL',
  key: 'generate_autologin_url',
  description: `Generates an auto-login hash URL for a conference room, allowing a participant to join directly without manually entering credentials. Role-based hashes are available for host, presenter, or listener.`
})
  .input(
    z.object({
      roomId: z.string().describe('ID of the conference room'),
      email: z.string().describe('Email address of the participant'),
      nickname: z.string().optional().describe('Display name for the participant'),
      role: z.enum(['1', '2', '3']).describe('Role: 1=listener, 2=presenter, 3=host')
    })
  )
  .output(
    z.object({
      autologinUrl: z.record(z.string(), z.unknown()).describe('Auto-login URL details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.generateAutologinHash(ctx.input.roomId, {
      email: ctx.input.email,
      nickname: ctx.input.nickname,
      role: ctx.input.role
    });

    return {
      output: { autologinUrl: result },
      message: `Generated auto-login URL for **${ctx.input.email}** (role: ${ctx.input.role}) for room ${ctx.input.roomId}.`
    };
  })
  .build();
