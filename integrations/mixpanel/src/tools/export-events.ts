import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { createClientFromContext, requireServiceAccount } from '../lib/helpers';
import { spec } from '../spec';

export let exportEvents = SlateTool.create(spec, {
  name: 'Export Raw Events',
  key: 'export_events',
  description: `Export raw event data from Mixpanel for a specified date range as a JSONL attachment.
Useful for feeding data into external systems or performing custom analysis.`,
  constraints: [
    'Rate limit: 60 queries per hour, 3 queries per second, max 100 concurrent queries.',
    'Use a limit parameter to control the number of returned events.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fromDate: z.string().describe('Start date in yyyy-mm-dd format (inclusive)'),
      toDate: z.string().describe('End date in yyyy-mm-dd format (inclusive)'),
      eventName: z.string().optional().describe('Filter by specific event name'),
      where: z.string().optional().describe('Filter expression for events'),
      limit: z.number().optional().describe('Maximum number of events to export')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of events exported'),
      contentType: z.string().describe('MIME type of the exported attachment'),
      byteLength: z.number().describe('Size of the exported attachment in bytes'),
      attachmentCount: z.number().describe('Number of attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    requireServiceAccount(ctx);

    let client = createClientFromContext(ctx);

    let result = await client.exportRawEvents({
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      event: ctx.input.eventName,
      where: ctx.input.where,
      limit: ctx.input.limit
    });

    return {
      output: {
        count: result.count,
        contentType: result.contentType,
        byteLength: result.byteLength,
        attachmentCount: 1
      },
      attachments: [createTextAttachment(result.content, result.contentType)],
      message: `Exported **${result.count}** event(s) from ${ctx.input.fromDate} to ${ctx.input.toDate}.`
    };
  })
  .build();
