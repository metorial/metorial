import { SlateTool } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { spec } from '../spec';

export let getTelephonyLogs = SlateTool.create(spec, {
  name: 'Get Telephony Logs',
  key: 'get_telephony_logs',
  description: `Retrieve Duo telephony log events. Returns records of phone calls and SMS messages sent for authentication purposes, including costs and outcomes.`,
  constraints: [
    'Logs are available for up to 180 days.',
    'mintime is a Unix timestamp in **seconds**.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mintime: z.string().describe('Start time as Unix timestamp in seconds'),
      maxtime: z.string().optional().describe('End time as Unix timestamp in seconds'),
      limit: z.number().optional().describe('Maximum number of log entries to return')
    })
  )
  .output(
    z.object({
      logs: z.array(
        z.object({
          timestamp: z.number().optional(),
          context: z.string().optional(),
          type: z.string().optional(),
          phone: z.string().optional(),
          credits: z.number().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname
    });

    let result = await client.getTelephonyLogs({
      mintime: ctx.input.mintime,
      maxtime: ctx.input.maxtime,
      limit: ctx.input.limit
    });

    let logs = (result.response || []).map((log: any) => ({
      timestamp: log.timestamp,
      context: log.context || undefined,
      type: log.type || undefined,
      phone: log.phone || undefined,
      credits: log.credits
    }));

    return {
      output: { logs },
      message: `Retrieved **${logs.length}** telephony log(s).`
    };
  })
  .build();
