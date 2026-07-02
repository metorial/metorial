import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let submitFeedback = SlateTool.create(spec, {
  name: 'Submit Feedback',
  key: 'submit_feedback',
  description: `Submit an image to Remove.bg's improvement program to help improve the AI model's accuracy. Use this after processing an image where the background removal result was unsatisfactory. The submitted image will be used to train and improve future results for similar images.`,
  instructions: [
    'Provide exactly one image source: either imageUrl or imageFileB64.',
    'Use the tag field to categorize the type of issue encountered.'
  ],
  constraints: ['Limited to 100 submissions per day.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      imageUrl: z
        .string()
        .optional()
        .describe('URL of the image to submit for improvement. Provide this or imageFileB64.'),
      imageFileB64: z
        .string()
        .optional()
        .describe('Base64-encoded image data to submit. Provide this or imageUrl.'),
      imageFilename: z
        .string()
        .optional()
        .describe('Optional filename for the submitted image.'),
      tag: z
        .string()
        .optional()
        .describe('Optional tag to categorize the feedback submission.')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Unique identifier for the feedback submission.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.submitFeedback({
      imageUrl: ctx.input.imageUrl,
      imageFileB64: ctx.input.imageFileB64,
      imageFilename: ctx.input.imageFilename,
      tag: ctx.input.tag
    });

    return {
      output: result,
      message: `Feedback submitted successfully. Submission ID: **${result.submissionId}**.`
    };
  })
  .build();
