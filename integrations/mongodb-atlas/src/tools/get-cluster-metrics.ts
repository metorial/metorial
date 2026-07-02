import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getClusterMetricsTool = SlateTool.create(spec, {
  name: 'Get Cluster Metrics',
  key: 'get_cluster_metrics',
  description: `Retrieve performance metrics and monitoring data for MongoDB Atlas cluster processes. Get CPU, memory, connections, opcounters, replication lag, disk utilization, and other metrics. Also lists cluster processes (mongod/mongos instances).`,
  instructions: [
    'First list processes to get process IDs, then use a processId to fetch measurements.',
    'Common metrics: SYSTEM_CPU_USER, SYSTEM_MEMORY_PERCENT_USED, CONNECTIONS, OPCOUNTER_CMD, OPCOUNTER_QUERY, OPCOUNTER_INSERT, OPCOUNTER_UPDATE, OPCOUNTER_DELETE, SYSTEM_NETWORK_IN, SYSTEM_NETWORK_OUT.',
    'Granularity options: PT1M, PT5M, PT1H, P1D.',
    'Either period or start/end must be specified for measurements.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Atlas Project ID. Uses config projectId if not provided.'),
      action: z
        .enum(['list_processes', 'get_measurements', 'get_disk_measurements'])
        .describe('Action to perform'),
      processId: z
        .string()
        .optional()
        .describe('Process ID (hostname:port format). Required for measurements.'),
      granularity: z
        .string()
        .optional()
        .describe('Measurement granularity (e.g., PT1M, PT5M, PT1H, P1D)'),
      period: z.string().optional().describe('ISO 8601 duration (e.g., PT1H, P1D, P7D)'),
      start: z.string().optional().describe('ISO 8601 start time'),
      end: z.string().optional().describe('ISO 8601 end time'),
      metrics: z.array(z.string()).optional().describe('Specific metrics to retrieve'),
      partitionName: z
        .string()
        .optional()
        .describe('Disk partition name (for disk measurements, e.g., "data")')
    })
  )
  .output(
    z.object({
      processes: z
        .array(
          z.object({
            processId: z.string(),
            hostname: z.string(),
            port: z.number(),
            typeName: z.string(),
            version: z.string().optional(),
            replicaSetName: z.string().optional()
          })
        )
        .optional(),
      measurements: z
        .array(
          z.object({
            name: z.string(),
            units: z.string(),
            dataPoints: z.array(
              z.object({
                timestamp: z.string(),
                value: z.number().nullable()
              })
            )
          })
        )
        .optional(),
      processId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw new Error('projectId is required. Provide it in input or config.');

    let { action } = ctx.input;

    if (action === 'list_processes') {
      let result = await client.getClusterProcesses(projectId);
      let processes = (result.results || []).map((p: any) => ({
        processId: `${p.hostname}:${p.port}`,
        hostname: p.hostname,
        port: p.port,
        typeName: p.typeName,
        version: p.version,
        replicaSetName: p.replicaSetName
      }));
      return {
        output: { processes },
        message: `Found **${processes.length}** process(es) in project.`
      };
    }

    if (!ctx.input.processId) throw new Error('processId is required for measurements.');
    if (!ctx.input.granularity) throw new Error('granularity is required for measurements.');

    if (action === 'get_measurements') {
      let result = await client.getProcessMeasurements(projectId, ctx.input.processId, {
        granularity: ctx.input.granularity,
        period: ctx.input.period,
        start: ctx.input.start,
        end: ctx.input.end,
        m: ctx.input.metrics
      });

      let measurements = (result.measurements || []).map((m: any) => ({
        name: m.name,
        units: m.units,
        dataPoints: (m.dataPoints || []).map((dp: any) => ({
          timestamp: dp.timestamp,
          value: dp.value
        }))
      }));

      return {
        output: { measurements, processId: ctx.input.processId },
        message: `Retrieved **${measurements.length}** metric(s) for process **${ctx.input.processId}**.`
      };
    }

    if (action === 'get_disk_measurements') {
      if (!ctx.input.partitionName)
        throw new Error('partitionName is required for disk measurements.');
      let result = await client.getDiskMeasurements(
        projectId,
        ctx.input.processId,
        ctx.input.partitionName,
        {
          granularity: ctx.input.granularity,
          period: ctx.input.period,
          start: ctx.input.start,
          end: ctx.input.end,
          m: ctx.input.metrics
        }
      );

      let measurements = (result.measurements || []).map((m: any) => ({
        name: m.name,
        units: m.units,
        dataPoints: (m.dataPoints || []).map((dp: any) => ({
          timestamp: dp.timestamp,
          value: dp.value
        }))
      }));

      return {
        output: { measurements, processId: ctx.input.processId },
        message: `Retrieved **${measurements.length}** disk metric(s) for process **${ctx.input.processId}** partition **${ctx.input.partitionName}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
