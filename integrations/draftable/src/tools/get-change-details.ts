import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getChangeDetails = SlateTool.create(spec, {
  name: 'Get Change Details',
  key: 'get_change_details',
  description: `Retrieves the comparison results as structured JSON. Provides a programmatic summary of all detected changes between two documents, including insertions, deletions, and replacements with their locations. Useful for integrating comparison results into workflows without the visual viewer.`,
  instructions: [
    'The comparison must be ready (fully processed) before change details can be retrieved.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      comparisonIdentifier: z.string().describe('Unique identifier of the comparison')
    })
  )
  .output(
    z.object({
      comparisonIdentifier: z.string().describe('Identifier of the comparison'),
      changes: z
        .any()
        .describe(
          'Array of detected changes, each with type, content, and location information'
        ),
      summary: z
        .any()
        .optional()
        .describe(
          'Summary statistics including total changes, word counts, and document metrics'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getChangeDetails(ctx.input.comparisonIdentifier);

    return {
      output: {
        comparisonIdentifier: ctx.input.comparisonIdentifier,
        changes: result.changes ?? result,
        summary: result.summary ?? undefined
      },
      message: `Retrieved change details for comparison **${ctx.input.comparisonIdentifier}**.`
    };
  })
  .build();
