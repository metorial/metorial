import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteComparison = SlateTool.create(spec, {
  name: 'Delete Comparison',
  key: 'delete_comparison',
  description: `Permanently deletes a comparison by its identifier. This also removes all associated exports and change details. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      comparisonIdentifier: z
        .string()
        .describe('Unique identifier of the comparison to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the comparison was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.deleteComparison(ctx.input.comparisonIdentifier);

    return {
      output: {
        deleted: true
      },
      message: `Comparison **${ctx.input.comparisonIdentifier}** has been deleted.`
    };
  })
  .build();
