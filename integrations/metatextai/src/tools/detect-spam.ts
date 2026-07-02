import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let detectSpam = SlateTool.create(spec, {
  name: 'Detect Spam',
  key: 'detect_spam',
  description: `Determine whether the given text is spam or not using Metatext AI's pre-built spam detection model. Useful for filtering user-generated content, moderating comments, or screening incoming messages and emails.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('The text to check for spam')
    })
  )
  .output(
    z.object({
      predictions: z
        .array(
          z.object({
            label: z.string().describe('The classification label (e.g. spam, not_spam)'),
            score: z.number().describe('Confidence score for the prediction')
          })
        )
        .describe('List of spam classification predictions with confidence scores')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.detectSpam(ctx.input.text);

    return {
      output: result,
      message: `Analyzed the provided text for spam.`
    };
  })
  .build();
