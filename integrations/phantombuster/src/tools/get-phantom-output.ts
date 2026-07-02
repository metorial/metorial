import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPhantomOutput = SlateTool.create(spec, {
  name: 'Get Phantom Output',
  key: 'get_phantom_output',
  description: `Retrieve the latest output from a Phantom including its current status, console output, progress, and result object. Useful for checking the state of a running or recently completed Phantom.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phantomId: z.string().describe('ID of the Phantom to get output from')
    })
  )
  .output(
    z.object({
      phantomStatus: z
        .string()
        .optional()
        .describe('Current status of the Phantom (e.g., running, finished)'),
      containerStatus: z.string().optional().describe('Status of the current container'),
      containerId: z.string().optional().describe('ID of the current container'),
      progress: z.any().optional().describe('Current progress information'),
      consoleOutput: z.string().optional().describe('Recent console output'),
      resultObject: z.any().optional().describe('Result object from the execution'),
      runningContainers: z
        .number()
        .optional()
        .describe('Number of currently running containers'),
      queuedContainers: z.number().optional().describe('Number of queued containers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.fetchAgentOutput(ctx.input.phantomId);

    return {
      output: {
        phantomStatus: data?.agentStatus ?? undefined,
        containerStatus: data?.containerStatus ?? undefined,
        containerId: data?.containerId ? String(data.containerId) : undefined,
        progress: data?.progress ?? undefined,
        consoleOutput: data?.output ?? undefined,
        resultObject: data?.resultObject ?? undefined,
        runningContainers: data?.runningContainers ?? undefined,
        queuedContainers: data?.queuedContainers ?? undefined
      },
      message: `Phantom **${ctx.input.phantomId}** status: ${data?.agentStatus ?? 'unknown'}.`
    };
  })
  .build();
