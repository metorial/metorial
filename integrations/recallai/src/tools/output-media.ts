import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let outputMediaTool = SlateTool.create(spec, {
  name: 'Bot Output Media',
  key: 'output_media',
  description: `Start or stop what a bot outputs into a live meeting for both audio and video. Use this to make bots "speak" audio, display images/video via their camera feed, or share screen content. Enables building interactive AI agents, real-time translators, and avatar-based participants.`,
  instructions: [
    'The bot must be actively in a meeting to output media.',
    'Audio requires automaticAudioOutput configured with create_bot or update_bot; video streams a webpage through its camera or screenshare.'
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
      kind: z.string().describe('Output type: audio, video_camera, or video_screenshare'),
      stop: z
        .boolean()
        .optional()
        .describe('Stop output of the selected kind; mediaData is unnecessary when true'),
      mediaData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'For video use {kind:"webpage",config:{url:"https://..."}}; for audio use {kind:"mp3",b64_data:"..."}'
        )
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
      data: ctx.input.mediaData,
      stop: ctx.input.stop
    });

    return {
      output: {
        botId: ctx.input.botId,
        response
      },
      message: `Output media (${ctx.input.kind}) ${ctx.input.stop ? 'stopped' : 'started'} via bot ${ctx.input.botId}.`
    };
  })
  .build();
