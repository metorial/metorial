import { SlateTool } from 'slates';
import { z } from 'zod';
import { AtlasClient } from '../lib/client';
import { mongodbServiceError } from '../lib/errors';
import { spec } from '../spec';

let measurementSchema = z.object({
  name: z.string().describe('Metric name'),
  units: z.string().optional().describe('Metric units'),
  dataPoints: z
    .array(
      z.object({
        timestamp: z.string().describe('ISO 8601 timestamp'),
        value: z.number().optional().describe('Metric value at the timestamp')
      })
    )
    .describe('Time-series data points')
});

let processSchema = z.object({
  processId: z.string().describe('Process identifier (hostname:port)'),
  hostname: z.string().describe('Hostname of the process'),
  port: z.number().describe('Port of the process'),
  typeName: z.string().describe('Process type (REPLICA_PRIMARY, REPLICA_SECONDARY, etc.)'),
  version: z.string().optional().describe('MongoDB version'),
  replicaSetName: z.string().optional().describe('Name of the replica set'),
  userAlias: z.string().optional().describe('User-friendly hostname alias')
});

export let getMetricsTool = SlateTool.create(spec, {
  name: 'Get Metrics',
  key: 'get_metrics',
  description: `Retrieve host process metrics, disk measurements, or list available processes for a MongoDB Atlas project. Supports common metrics like connections, opcounters, memory, CPU, and disk utilization. Use this to monitor cluster health and performance.`,
  instructions: [
    'First use action "list_processes" to discover available process IDs.',
    'The processId format is "hostname:port" (e.g., "cluster0-shard-00-00.abc.mongodb.net:27017").',
    'Common metric names: CONNECTIONS, OPCOUNTER_CMD, OPCOUNTER_INSERT, OPCOUNTER_QUERY, SYSTEM_CPU_USER, SYSTEM_MEMORY_USED, CACHE_BYTES_READ_INTO, CACHE_BYTES_WRITTEN_FROM.',
    'Granularity options: PT1M, PT5M, PT1H, P1D.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list_processes', 'get_measurements', 'get_disk_measurements'])
        .describe('Action to perform'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID. Falls back to configured projectId.'),
      processId: z
        .string()
        .optional()
        .describe(
          'Process ID in "hostname:port" format (for get_measurements, get_disk_measurements)'
        ),
      granularity: z
        .string()
        .optional()
        .describe('Measurement granularity (PT1M, PT5M, PT1H, P1D)'),
      period: z
        .string()
        .optional()
        .describe('Time period (e.g., PT1H, P1D, P7D). Mutually exclusive with start/end.'),
      start: z.string().optional().describe('ISO 8601 start time'),
      end: z.string().optional().describe('ISO 8601 end time'),
      metrics: z.array(z.string()).optional().describe('Specific metric names to retrieve'),
      partitionName: z
        .string()
        .optional()
        .describe('Disk partition name (for get_disk_measurements, usually "data")')
    })
  )
  .output(
    z.object({
      processes: z.array(processSchema).optional().describe('List of processes'),
      measurements: z.array(measurementSchema).optional().describe('Metric measurements'),
      processId: z.string().optional().describe('Process ID for the measurements'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw mongodbServiceError('projectId is required');

    let client = new AtlasClient(ctx.auth);

    if (ctx.input.action === 'list_processes') {
      let result = await client.listProcesses(projectId);
      let processes = (result.results || []).map((p: any) => ({
        processId: `${p.hostname}:${p.port}`,
        hostname: p.hostname,
        port: p.port,
        typeName: p.typeName,
        version: p.version,
        replicaSetName: p.replicaSetName,
        userAlias: p.userAlias
      }));
      return {
        output: { processes, totalCount: result.totalCount ?? processes.length },
        message: `Found **${processes.length}** process(es) in project.`
      };
    }

    if (ctx.input.action === 'get_measurements') {
      if (!ctx.input.processId) throw mongodbServiceError('processId is required');
      let params: any = {
        granularity: ctx.input.granularity || 'PT1H'
      };
      if (ctx.input.period) params.period = ctx.input.period;
      if (ctx.input.start) params.start = ctx.input.start;
      if (ctx.input.end) params.end = ctx.input.end;
      if (ctx.input.metrics) params.m = ctx.input.metrics;

      let result = await client.getProcessMeasurements(projectId, ctx.input.processId, params);
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

    if (ctx.input.action === 'get_disk_measurements') {
      if (!ctx.input.processId) throw mongodbServiceError('processId is required');
      let partition = ctx.input.partitionName || 'data';
      let params: any = {
        granularity: ctx.input.granularity || 'PT1H'
      };
      if (ctx.input.period) params.period = ctx.input.period;
      if (ctx.input.start) params.start = ctx.input.start;
      if (ctx.input.end) params.end = ctx.input.end;
      if (ctx.input.metrics) params.m = ctx.input.metrics;

      let result = await client.getProcessDiskMeasurements(
        projectId,
        ctx.input.processId,
        partition,
        params
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
        message: `Retrieved **${measurements.length}** disk metric(s) for process **${ctx.input.processId}** (partition: ${partition}).`
      };
    }

    throw mongodbServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
