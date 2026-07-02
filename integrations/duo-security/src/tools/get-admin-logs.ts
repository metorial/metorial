import { SlateTool } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { spec } from '../spec';

export let getAdminLogs = SlateTool.create(spec, {
  name: 'Get Administrator Logs',
  key: 'get_admin_logs',
  description: `Retrieve Duo administrator action logs. Returns records of actions performed by administrators such as user creation, policy changes, and configuration updates.`,
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
          username: z.string().optional(),
          action: z.string().optional(),
          objectType: z.string().optional(),
          objectName: z.string().optional(),
          description: z.string().optional()
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

    let result = await client.getAdministratorLogs({
      mintime: ctx.input.mintime,
      maxtime: ctx.input.maxtime,
      limit: ctx.input.limit
    });

    let logs = (result.response || []).map((log: any) => ({
      timestamp: log.timestamp,
      username: log.username || undefined,
      action: log.action || undefined,
      objectType: log.object || undefined,
      objectName: log.object_name || undefined,
      description: log.description ? JSON.stringify(log.description) : undefined
    }));

    return {
      output: { logs },
      message: `Retrieved **${logs.length}** administrator log(s).`
    };
  })
  .build();
