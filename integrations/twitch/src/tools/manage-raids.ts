import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let manageRaids = SlateTool.create(spec, {
  name: 'Manage Raids',
  key: 'manage_raids',
  description: `Start or cancel a raid to another channel. Raids redirect your viewers to another streamer's channel.`,
  instructions: [
    'To **start** a raid, provide the target broadcaster ID.',
    'To **cancel** a pending raid, set action to "cancel".',
    'The broadcaster must be live to start a raid.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      fromBroadcasterId: z.string().describe('Your broadcaster user ID (raiding from)'),
      action: z.enum(['start', 'cancel']).describe('Whether to start or cancel a raid'),
      toBroadcasterId: z
        .string()
        .optional()
        .describe('Target broadcaster ID (required for start)')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      createdAt: z.string().optional(),
      isMature: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);

    if (ctx.input.action === 'start') {
      if (!ctx.input.toBroadcasterId)
        throw new Error('toBroadcasterId is required to start a raid');

      let result = await client.startRaid(
        ctx.input.fromBroadcasterId,
        ctx.input.toBroadcasterId
      );

      return {
        output: { success: true, createdAt: result.createdAt, isMature: result.isMature },
        message: `Raid started to broadcaster \`${ctx.input.toBroadcasterId}\``
      };
    }

    await client.cancelRaid(ctx.input.fromBroadcasterId);

    return {
      output: { success: true },
      message: 'Raid canceled'
    };
  })
  .build();
