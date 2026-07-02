import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateHashtags = SlateTool.create(spec, {
  name: 'Generate Hashtags',
  key: 'generate_hashtags',
  description: `Automatically generate and add relevant hashtags to post text using AI. Takes into account real-time hashtag popularity. Returns the post text with hashtags added.`,
  instructions: [
    'Best results achieved with English-language posts.',
    'Maximum input text length is 1,000 characters.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      post: z.string().max(1000).describe('Post text to generate hashtags for'),
      max: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('Maximum number of hashtags to add (default: 2, Instagram max: 5)'),
      position: z
        .enum(['auto', 'end'])
        .optional()
        .describe('Where to place hashtags ("auto" or "end")'),
      language: z.string().optional().describe('Language code to assist the algorithm')
    })
  )
  .output(
    z.object({
      post: z.string().describe('Post text with hashtags added')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      profileKey: ctx.config.profileKey
    });

    let result = await client.generateHashtags({
      post: ctx.input.post,
      max: ctx.input.max,
      position: ctx.input.position,
      language: ctx.input.language
    });

    return {
      output: {
        post: result.post
      },
      message: `Generated hashtags for post. Result: "${result.post}"`
    };
  })
  .build();
