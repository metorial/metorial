import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmsAlertClient } from '../lib/client';
import { spec } from '../spec';

export let getSmsReport = SlateTool.create(spec, {
  name: 'Get SMS Report',
  key: 'get_sms_report',
  description: `Retrieve sent SMS campaign logs with optional filtering by date range, mobile number, or sender ID. Use this to review message delivery history.`,
  instructions: ['Dates should be in YYYY-MM-DD format.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fromDate: z.string().optional().describe('Start date for the report (YYYY-MM-DD).'),
      toDate: z.string().optional().describe('End date for the report (YYYY-MM-DD).'),
      mobileNumber: z.string().optional().describe('Filter by recipient mobile number.'),
      senderId: z.string().optional().describe('Filter by sender ID.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the API response.'),
      description: z.any().describe('SMS report data including delivery details and statuses.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmsAlertClient({ token: ctx.auth.token });

    ctx.info('Fetching SMS report');
    let result = await client.getSmsReport({
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      mobileNo: ctx.input.mobileNumber,
      sender: ctx.input.senderId
    });

    return {
      output: {
        status: result.status || 'unknown',
        description: result.description || result
      },
      message: `SMS report retrieved${ctx.input.fromDate ? ` from **${ctx.input.fromDate}**` : ''}${ctx.input.toDate ? ` to **${ctx.input.toDate}**` : ''}`
    };
  })
  .build();
