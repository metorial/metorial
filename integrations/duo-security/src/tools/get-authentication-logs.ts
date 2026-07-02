import { SlateTool } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { spec } from '../spec';

export let getAuthenticationLogs = SlateTool.create(spec, {
  name: 'Get Authentication Logs',
  key: 'get_authentication_logs',
  description: `Retrieve Duo authentication log events using the v2 API. Returns detailed records of authentication attempts including user, application, result, and device information.
Events have a 2-minute delay before becoming available.`,
  constraints: [
    'Logs are available for up to 180 days.',
    'There is a 2-minute delay before new events are available.',
    'mintime and maxtime are Unix timestamps in **milliseconds**.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mintime: z.string().describe('Start time as Unix timestamp in milliseconds'),
      maxtime: z.string().describe('End time as Unix timestamp in milliseconds'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of log entries to return (default 100)'),
      nextOffset: z
        .array(z.string())
        .optional()
        .describe(
          'Pagination offset from previous response metadata (array of [timestamp, txid])'
        )
    })
  )
  .output(
    z.object({
      authlogs: z.array(
        z.object({
          txid: z.string().optional(),
          timestamp: z.number().optional(),
          username: z.string().optional(),
          factor: z.string().optional(),
          result: z.string().optional(),
          reason: z.string().optional(),
          applicationName: z.string().optional(),
          applicationKey: z.string().optional(),
          accessDeviceIp: z.string().optional(),
          accessDeviceLocation: z.any().optional(),
          authDeviceName: z.string().optional(),
          eventType: z.string().optional(),
          email: z.string().optional()
        })
      ),
      totalObjects: z.number().optional(),
      nextOffset: z.array(z.string()).optional(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname
    });

    let result = await client.getAuthenticationLogsV2({
      mintime: ctx.input.mintime,
      maxtime: ctx.input.maxtime,
      limit: ctx.input.limit,
      nextOffset: ctx.input.nextOffset
    });

    let data = result.response;
    let logs = (data.authlogs || []).map((log: any) => ({
      txid: log.txid,
      timestamp: log.timestamp,
      username: log.user?.name || undefined,
      factor: log.factor,
      result: log.result,
      reason: log.reason,
      applicationName: log.application?.name || undefined,
      applicationKey: log.application?.key || undefined,
      accessDeviceIp: log.access_device?.ip || undefined,
      accessDeviceLocation: log.access_device?.location || undefined,
      authDeviceName: log.auth_device?.name || undefined,
      eventType: log.event_type || undefined,
      email: log.email || undefined
    }));

    let nextOffset = data.metadata?.next_offset;
    let totalObjects = data.metadata?.total_objects;

    return {
      output: {
        authlogs: logs,
        totalObjects,
        nextOffset: nextOffset || undefined,
        hasMore: !!nextOffset
      },
      message: `Retrieved **${logs.length}** authentication log(s)${totalObjects ? ` out of ${totalObjects} total` : ''}.`
    };
  })
  .build();
