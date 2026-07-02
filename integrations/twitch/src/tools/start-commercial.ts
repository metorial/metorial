import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let startCommercial = SlateTool.create(spec, {
  name: 'Start Commercial',
  key: 'start_commercial',
  description: `Start a commercial (ad break) on a channel. The broadcaster must be live and an affiliate or partner.`,
  constraints: [
    'Valid lengths: 30, 60, 90, 120, 150, or 180 seconds.',
    'A cooldown period applies between commercials.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      broadcasterId: z.string().describe('Broadcaster user ID'),
      lengthSeconds: z
        .number()
        .describe('Commercial length in seconds (30, 60, 90, 120, 150, or 180)')
    })
  )
  .output(
    z.object({
      lengthSeconds: z.number().describe('Actual commercial length'),
      message: z.string().describe('Status message from Twitch'),
      retryAfterSeconds: z.number().describe('Seconds until another commercial can be run')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);

    let result = await client.startCommercial(
      ctx.input.broadcasterId,
      ctx.input.lengthSeconds
    );

    return {
      output: {
        lengthSeconds: result.length,
        message: result.message,
        retryAfterSeconds: result.retryAfter
      },
      message: `Started ${result.length}s commercial. Next available in ${result.retryAfter}s.`
    };
  })
  .build();
