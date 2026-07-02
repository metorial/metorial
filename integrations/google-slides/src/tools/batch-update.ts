import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlidesClient } from '../lib/client';
import { googleSlidesActionScopes } from '../scopes';
import { spec } from '../spec';

export let batchUpdate = SlateTool.create(spec, {
  name: 'Batch Update',
  key: 'batch_update',
  description: `Sends multiple raw update requests to a presentation in a single atomic batch. All requests succeed or fail together. This is the most flexible tool — use it for advanced operations or when you need to combine multiple actions (e.g., create a slide, insert text, add an image) in one call.`,
  instructions: [
    'Each request object must follow the Google Slides API batchUpdate request format.',
    'Common request types: createSlide, createShape, createImage, insertText, deleteText, replaceAllText, updateTextStyle, deleteObject, duplicateObject, updateSlidesPosition, replaceAllShapesWithImage, createSheetsChart, refreshSheetsChart, updatePageElementTransform, updateShapeProperties, createParagraphBullets.',
    'Requests are executed in order. If any request fails, the entire batch is rolled back.',
    'Refer to the Google Slides API reference for the exact structure of each request type.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleSlidesActionScopes.batchUpdate)
  .input(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      requests: z
        .array(z.record(z.string(), z.any()))
        .min(1)
        .describe(
          'Array of request objects following the Google Slides API batchUpdate format'
        )
    })
  )
  .output(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      requestCount: z.number().describe('Number of requests executed'),
      replies: z.array(z.any()).describe('Array of replies corresponding to each request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlidesClient(ctx.auth.token);
    let { presentationId, requests } = ctx.input;

    let result = await client.batchUpdate(presentationId, requests);

    return {
      output: {
        presentationId,
        requestCount: requests.length,
        replies: result.replies || []
      },
      message: `Executed **${requests.length}** request(s) in a single batch update.`
    };
  })
  .build();
