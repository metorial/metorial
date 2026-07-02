import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePlayerSettings = SlateTool.create(spec, {
  name: 'Update Player Settings',
  key: 'update_player_settings',
  description: `Update the player settings for a specific video. Settings control the appearance and behavior of the embedded video player (e.g., controls, branding, colors, autoplay).`,
  instructions: [
    'The videoId must be the base64-decoded video ID.',
    'Settings should be a JSON object of key-value pairs representing player configuration options.'
  ]
})
  .input(
    z.object({
      videoId: z.string().describe('The ID of the video whose player settings to update.'),
      settings: z
        .record(z.string(), z.any())
        .describe('Player settings as key-value pairs to apply to the video.')
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.any())
        .describe('Response from Spotlightr after updating player settings.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updatePlayerSettings(ctx.input.videoId, ctx.input.settings);

    return {
      output: {
        result
      },
      message: `Updated player settings for video **${ctx.input.videoId}**.`
    };
  })
  .build();
