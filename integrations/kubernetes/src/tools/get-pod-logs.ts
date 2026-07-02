import { SlateTool } from 'slates';
import { z } from 'zod';
import { createKubeClient } from '../lib/client';
import { spec } from '../spec';

export let getPodLogs = SlateTool.create(spec, {
  name: 'Get Pod Logs',
  key: 'get_pod_logs',
  description: `Retrieve logs from a specific pod. Supports selecting a specific container in multi-container pods, tailing a fixed number of lines, and fetching logs from a previous container instance.`,
  instructions: [
    'For multi-container pods, specify containerName to get logs from a specific container.',
    'Use tailLines to limit output to the most recent N lines.',
    "Set previous to true to get logs from a crashed/restarted container's previous instance."
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      podName: z.string().describe('Name of the pod'),
      namespace: z.string().optional().describe('Namespace of the pod'),
      containerName: z
        .string()
        .optional()
        .describe('Specific container name in a multi-container pod'),
      tailLines: z.number().optional().describe('Number of most recent log lines to return'),
      sinceSeconds: z
        .number()
        .optional()
        .describe('Only return logs newer than this many seconds'),
      previous: z
        .boolean()
        .optional()
        .describe('Return logs from the previous container instance')
    })
  )
  .output(
    z.object({
      podName: z.string().describe('Name of the pod'),
      podNamespace: z.string().optional().describe('Namespace of the pod'),
      containerName: z.string().optional().describe('Container the logs are from'),
      logs: z.string().describe('Log output text'),
      lineCount: z.number().describe('Approximate number of log lines')
    })
  )
  .handleInvocation(async ctx => {
    let client = createKubeClient(ctx.config, ctx.auth);

    let logs = await client.getResourceLogs(ctx.input.podName, ctx.input.namespace, {
      container: ctx.input.containerName,
      tailLines: ctx.input.tailLines,
      sinceSeconds: ctx.input.sinceSeconds,
      previous: ctx.input.previous
    });

    let logStr = typeof logs === 'string' ? logs : JSON.stringify(logs);
    let lineCount = logStr ? logStr.split('\n').length : 0;

    return {
      output: {
        podName: ctx.input.podName,
        podNamespace: ctx.input.namespace,
        containerName: ctx.input.containerName,
        logs: logStr,
        lineCount
      },
      message: `Retrieved **${lineCount} lines** of logs from pod **${ctx.input.podName}**${ctx.input.containerName ? ` (container: ${ctx.input.containerName})` : ''}.`
    };
  })
  .build();
