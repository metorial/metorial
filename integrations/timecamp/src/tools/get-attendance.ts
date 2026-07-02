import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAttendance = SlateTool.create(spec, {
  name: 'Get Attendance',
  key: 'get_attendance',
  description: `Retrieve attendance records from TimeCamp. Shows total work hours per day and exact start/end times of working days. Useful for payroll and workforce management.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      date: z.string().optional().describe('Date to filter (YYYY-MM-DD)'),
      userId: z.number().optional().describe('User ID to filter by')
    })
  )
  .output(
    z.object({
      records: z.array(z.any()).describe('Attendance records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let records = await client.getAttendance({
      date: ctx.input.date,
      userId: ctx.input.userId
    });

    let recordList = Array.isArray(records) ? records : records ? [records] : [];

    return {
      output: {
        records: recordList
      },
      message: `Retrieved **${recordList.length}** attendance records${ctx.input.date ? ` for ${ctx.input.date}` : ''}.`
    };
  })
  .build();
