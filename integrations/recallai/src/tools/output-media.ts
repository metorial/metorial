import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let outputMediaTool = SlateTool.create(spec, {
  name: 'Bot Output Media',
  key: 'output_media',
  description: `Control what a bot outputs into a live meeting for both audio and video. Use this to make bots "speak" audio, display images/video via their camera feed, or share screen content. Enables building interactive AI agents, real-time translators, and avatar-based participants.`,
  instructions: [
    'The bot must be actively in a meeting to output media.',
    'Refer to Recall.ai docs for supported media kinds and data formats.'
  ],
  constraints: ['The bot must be in an active call.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      botId: z.string().describe('The unique identifier of the bot to output media from'),
      kind: z
        .string()
        .describe(
          'The type of media output, e.g. "audio", "video_camera", "video_screenshare"'
        ),
      mediaData: z
        .record(z.string(), z.unknown())
        .describe('Media output data (format depends on kind)')
    })
  )
  .output(
    z.object({
      botId: z.string().describe('Bot ID that output the media'),
      response: z
        .record(z.string(), z.unknown())
        .describe('API response from the output media request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let response = await client.outputMedia(ctx.input.botId, {
      kind: ctx.input.kind,
      data: ctx.input.mediaData
    });

    return {
      output: {
        botId: ctx.input.botId,
        response
      },
      message: `Output media (${ctx.input.kind}) sent via bot ${ctx.input.botId}.`
    };
  })
  .build();
