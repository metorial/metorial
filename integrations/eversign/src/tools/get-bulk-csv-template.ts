import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { businessIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getBulkCsvTemplate = SlateTool.create(spec, {
  name: 'Get Bulk CSV Template',
  key: 'get_bulk_csv_template',
  description:
    'Download the blank CSV structure for a template before preparing create_bulk_job data. Call list_businesses to discover the businessId.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      businessId: businessIdSchema,
      templateHash: z.string().describe('Template hash from list_templates')
    })
  )
  .output(
    z.object({
      templateHash: z.string(),
      mimeType: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth, ctx.input.businessId);
    await client.getBulkCsvTemplate(ctx.input.templateHash);
    await ctx.addAttachment({
      type: 'url',
      ...client.getBulkCsvDownloadDetails(ctx.input.templateHash),
      mimeType: 'text/csv'
    });
    return {
      output: { templateHash: ctx.input.templateHash, mimeType: 'text/csv' },
      message: `Prepared the bulk CSV structure for template "${ctx.input.templateHash}" for download.`
    };
  })
  .build();
