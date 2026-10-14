import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SmsAlertClient } from '../lib/client';
import { limitSchema, pageSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getSmsReport = SlateTool.create(spec, {
  name: 'Get SMS Report',
  key: 'get_sms_report',
  description: `Retrieve a page of SMS campaign logs with search and scheduled-campaign filtering. Date and sender filters apply to the returned page. Use get_delivery_status with a batch ID for recipient delivery details.`,
  instructions: ['Dates should be in YYYY-MM-DD format.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: pageSchema,
      limit: limitSchema,
      query: z.string().optional().describe('Provider search query for campaign logs.'),
      scheduledOnly: z
        .boolean()
        .optional()
        .describe('Request only scheduled campaigns when true.'),
      fromDate: z
        .string()
        .optional()
        .describe('Filter the returned page from this date (YYYY-MM-DD).'),
      toDate: z
        .string()
        .optional()
        .describe('Filter the returned page through this date (YYYY-MM-DD).'),
      mobileNumber: z
        .string()
        .optional()
        .describe(
          'Legacy recipient filter. Campaign logs do not support this filter; omit it and use get_delivery_status to inspect recipients.'
        ),
      senderId: z.string().optional().describe('Filter the returned page by sender ID.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the API response.'),
      description: z.any().describe('SMS report data including delivery details and statuses.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmsAlertClient(ctx.auth);

    for (let date of [ctx.input.fromDate, ctx.input.toDate]) {
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))
        throw createApiServiceError('Report dates must use YYYY-MM-DD format.');
    }
    if (ctx.input.fromDate && ctx.input.toDate && ctx.input.fromDate > ctx.input.toDate)
      throw createApiServiceError('fromDate must be on or before toDate.');

    ctx.info('Fetching SMS report');
    let result = await client.getSmsReport({
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      mobileNo: ctx.input.mobileNumber,
      sender: ctx.input.senderId,
      page: ctx.input.page,
      limit: ctx.input.limit,
      query: ctx.input.query,
      scheduledOnly: ctx.input.scheduledOnly
    });

    return {
      output: {
        status: result.status || 'unknown',
        description: result.description ?? result
      },
      message: `SMS report retrieved${ctx.input.fromDate ? ` from **${ctx.input.fromDate}**` : ''}${ctx.input.toDate ? ` to **${ctx.input.toDate}**` : ''}`
    };
  })
  .build();
