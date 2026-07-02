import { SlateTool } from 'slates';
import { z } from 'zod';
import { NanonetsClient } from '../lib/client';
import { spec } from '../spec';

export let updateFileFields = SlateTool.create(spec, {
  name: 'Update File Fields',
  key: 'update_file_fields',
  description:
    'Update the moderated field data for a processed Nanonets file by submitting a complete moderated_boxes array.',
  instructions: [
    'First retrieve the current page data with Get Prediction Results using a pageId.',
    'Modify the returned boxes and submit the complete moderatedBoxes array. Nanonets treats omitted boxes as deleted.',
    'Set is_new on new boxes when adding fields, following the Nanonets API contract.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      modelId: z.string().describe('ID of the model the file belongs to'),
      moderatedBoxes: z
        .array(z.record(z.string(), z.any()))
        .min(1)
        .describe(
          'Complete moderated_boxes payload for the page, including unchanged boxes that should be retained'
        ),
      useUiVersion: z
        .boolean()
        .default(true)
        .describe('Use the Nanonets UI-compatible update behavior')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update request was accepted'),
      modelId: z.string().describe('ID of the model the file belongs to'),
      updatedBoxCount: z.number().describe('Number of boxes submitted'),
      rawResponse: z.any().optional().describe('Raw Nanonets response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NanonetsClient(ctx.auth.token);

    let result = await client.updateFileFields(
      ctx.input.modelId,
      ctx.input.moderatedBoxes,
      ctx.input.useUiVersion
    );

    return {
      output: {
        success: true,
        modelId: ctx.input.modelId,
        updatedBoxCount: ctx.input.moderatedBoxes.length,
        rawResponse: result
      },
      message: `Updated **${ctx.input.moderatedBoxes.length}** moderated field box(es) in model \`${ctx.input.modelId}\`.`
    };
  })
  .build();
