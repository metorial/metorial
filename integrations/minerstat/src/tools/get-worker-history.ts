import { SlateTool } from 'slates';
import { z } from 'zod';
import { MonitoringClient } from '../lib/client';
import { spec } from '../spec';

export let getWorkerHistoryTool = SlateTool.create(spec, {
  name: 'Get Worker History',
  key: 'get_worker_history',
  description: `Retrieve historical data for a specific worker. Includes hashrate history, mining statistics (earnings, efficiency), and activity logs. Choose the data type to control which historical data is returned. Useful for tracking performance trends and diagnosing issues.`,
  instructions: [
    'Use "hashrate" for hashrate, temperature, fan, and power history.',
    'Use "statistics" for earnings, efficiency, and performance history.',
    'Use "activity" for the last 3 days of worker activity logs.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workerName: z.string().describe('Name of the worker to retrieve history for'),
      dataType: z
        .enum(['hashrate', 'statistics', 'activity'])
        .describe('Type of historical data to retrieve'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for the data (e.g. "America/New_York")')
    })
  )
  .output(
    z.object({
      workerName: z.string().describe('Name of the queried worker'),
      dataType: z.string().describe('Type of data returned'),
      entries: z.array(z.record(z.string(), z.any())).describe('Historical data entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MonitoringClient({ accessKey: ctx.auth.accessKey });

    let params: { tz?: string } = {};
    if (ctx.input.timezone) params.tz = ctx.input.timezone;

    ctx.progress(`Fetching ${ctx.input.dataType} history for ${ctx.input.workerName}...`);

    let result: any;
    switch (ctx.input.dataType) {
      case 'hashrate':
        result = await client.getWorkerHashrate(ctx.input.workerName, params);
        break;
      case 'statistics':
        result = await client.getWorkerStatistics(ctx.input.workerName, params);
        break;
      case 'activity':
        result = await client.getWorkerActivity(ctx.input.workerName);
        break;
    }

    let entries = Array.isArray(result)
      ? result
      : typeof result === 'object'
        ? Object.values(result)
        : [];

    return {
      output: {
        workerName: ctx.input.workerName,
        dataType: ctx.input.dataType,
        entries: entries as any[]
      },
      message: `Retrieved **${entries.length}** ${ctx.input.dataType} entries for worker **${ctx.input.workerName}**.`
    };
  })
  .build();
