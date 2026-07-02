import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let detectNsfw = SlateTool.create(spec, {
  name: 'Detect NSFW Content',
  key: 'detect_nsfw',
  description: `Detect not-safe-for-work content in images including nudity and gore. Returns boolean flags and confidence scores (0-1) for each category. Provide an image URL or file store key.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().optional().describe('Image URL to analyze'),
      fileStoreKey: z
        .string()
        .optional()
        .describe('File store key of a previously uploaded image')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      nsfw: z.boolean().describe('Whether NSFW content was detected'),
      nudity: z.boolean().describe('Whether nudity was detected'),
      gore: z.boolean().describe('Whether gore/violence was detected'),
      nsfwScore: z.number().describe('NSFW confidence score (0-1)'),
      nudityScore: z.number().describe('Nudity confidence score (0-1)'),
      goreScore: z.number().describe('Gore confidence score (0-1)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.detectNsfw({
      url: ctx.input.url,
      fileStoreKey: ctx.input.fileStoreKey
    });

    return {
      output: {
        success: result.success,
        nsfw: result.nsfw,
        nudity: result.nudity,
        gore: result.gore,
        nsfwScore: result.nsfw_score,
        nudityScore: result.nudity_score,
        goreScore: result.gore_score
      },
      message: `NSFW detection complete. ${result.nsfw ? '**NSFW content detected.**' : 'Image is safe.'} Scores: NSFW=${result.nsfw_score}, nudity=${result.nudity_score}, gore=${result.gore_score}.`
    };
  })
  .build();
