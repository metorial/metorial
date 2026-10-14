import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTagUsage = SlateTool.create(spec, {
  name: 'Get Tag Usage',
  key: 'get_tag_usage',
  description:
    'Get page usage by extraction mode for a tag, optionally within a date range. Use the tag supplied to Extract Document. If neither date is supplied, the API reports the last 30 days.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      tag: z
        .string()
        .min(1)
        .describe('Tag supplied to Extract Document, or "default" for untagged jobs.'),
      fromDate: z
        .string()
        .optional()
        .describe('Start date in YYYY-MM-DD format. Omit to use the provider default.'),
      toDate: z
        .string()
        .optional()
        .describe('End date in YYYY-MM-DD format. Omit to use the provider default.')
    })
  )
  .output(
    z.object({
      tag: z.string().describe('Tag whose usage was queried.'),
      startDate: z.string().nullable().describe('Start of the usage reporting period.'),
      endDate: z.string().nullable().describe('End of the usage reporting period.'),
      subscriptionId: z
        .union([z.string(), z.number()])
        .nullable()
        .describe('Subscription identifier returned by the provider.'),
      usage: z
        .array(
          z.object({
            pagesProcessed: z.number().describe('Number of pages processed in this mode.'),
            serviceType: z
              .string()
              .describe('Extraction mode, such as "form" or "native_text".')
          })
        )
        .describe('Page counts grouped by extraction mode.')
    })
  )
  .handleInvocation(async ctx => {
    for (let date of [ctx.input.fromDate, ctx.input.toDate]) {
      if (date !== undefined) {
        let parsed = new Date(`${date}T00:00:00.000Z`);
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          Number.isNaN(parsed.getTime()) ||
          parsed.toISOString().slice(0, 10) !== date
        ) {
          throw createApiServiceError('Usage dates must be valid dates in YYYY-MM-DD format.');
        }
      }
    }
    if (ctx.input.fromDate && ctx.input.toDate && ctx.input.fromDate > ctx.input.toDate) {
      throw createApiServiceError('The usage start date must be on or before the end date.');
    }

    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let output = await client.getTagUsage(ctx.input.tag, ctx.input.fromDate, ctx.input.toDate);

    return {
      output,
      message: `Retrieved usage for tag **${output.tag}** across ${output.usage.length} extraction mode(s).`
    };
  })
  .build();
