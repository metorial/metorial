import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let createVideoFromPrompt = SlateTool.create(spec, {
  name: 'Create Video from Prompt',
  key: 'create_video_from_prompt',
  description: `Generate a video using the Video Agent from a simple natural language prompt. Instead of manually configuring scenes, avatars, and scripts, describe what you want and HeyGen's AI handles the rest — from scriptwriting to visual assembly.`,
  instructions: [
    'Provide a clear, descriptive prompt explaining what the video should contain.',
    'Optionally specify a preferred avatar or voice to use.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      prompt: z
        .string()
        .describe('Natural language description of the video you want to create'),
      avatarId: z.string().optional().describe('Preferred avatar ID to use in the video'),
      voiceId: z.string().optional().describe('Preferred voice ID to use in the video'),
      title: z.string().optional().describe('Title for the video'),
      callbackId: z
        .string()
        .optional()
        .describe('Custom callback ID for webhook notifications')
    })
  )
  .output(
    z.object({
      videoId: z.string().describe('Generated video ID for status polling')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient({ token: ctx.auth.token });

    let result = await client.createVideoAgent({
      prompt: ctx.input.prompt,
      avatarId: ctx.input.avatarId,
      voiceId: ctx.input.voiceId,
      title: ctx.input.title,
      callbackId: ctx.input.callbackId
    });

    return {
      output: result,
      message: `Video Agent started generating video from prompt. Video ID: **${result.videoId}**. Use "Get Video Status" to check progress.`
    };
  })
  .build();
