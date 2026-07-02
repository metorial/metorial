import { SlateTool } from 'slates';
import { z } from 'zod';
import { ListcleanClient } from '../lib/client';
import { spec } from '../spec';

export let downloadBulkResults = SlateTool.create(spec, {
  name: 'Download Bulk Results',
  key: 'download_bulk_results',
  description: `Download the verification results for a completed bulk email list. Results can be filtered to return all emails, only clean (valid) emails, or only dirty (invalid) emails. The list must have a COMPLETED status before results can be downloaded.`,
  instructions: [
    'The list must have status COMPLETED before downloading results.',
    'Use the filter parameter to get only the subset of results you need.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('The unique identifier of the completed bulk list'),
      filter: z
        .enum(['all', 'clean', 'dirty'])
        .default('all')
        .describe('Filter results: all emails, only clean (valid), or only dirty (invalid)')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('The bulk list identifier'),
      filter: z.string().describe('The filter that was applied'),
      csvContent: z.string().describe('The CSV content of the verification results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ListcleanClient({
      token: ctx.auth.token
    });

    ctx.progress('Downloading bulk results...');
    let csvContent = await client.downloadBulkResults(ctx.input.listId, ctx.input.filter);

    return {
      output: {
        listId: ctx.input.listId,
        filter: ctx.input.filter,
        csvContent
      },
      message: `Downloaded **${ctx.input.filter}** results for bulk list **${ctx.input.listId}**.`
    };
  })
  .build();
