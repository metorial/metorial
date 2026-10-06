import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, text } from '../lib/client';
import { execution } from '../lib/responses';
import { spec } from '../spec';

export let getExecution = SlateTool.create(spec, {
  name: 'Get Execution',
  key: 'get_execution',
  description: `Retrieve details about a specific Phantom execution (container) including its status, console output, exit message, and result data. Use a container ID from a launch or from the execution history.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      containerId: z.string().describe('ID of the container (execution) to fetch'),
      includeOutput: z
        .boolean()
        .optional()
        .describe('Whether to also fetch the console output. Defaults to false.'),
      includeResultObject: z
        .boolean()
        .optional()
        .describe('Whether to also fetch the result object. Defaults to false.')
    })
  )
  .output(
    z.object({
      containerId: z.string().describe('ID of the container'),
      phantomId: z.string().optional().describe('ID of the associated Phantom'),
      status: z.string().optional().describe('Current status of the execution'),
      exitCode: z.number().optional().describe('Exit code of the execution'),
      exitMessage: z.string().optional().describe('Exit message from the execution'),
      launchTimestamp: z
        .number()
        .optional()
        .describe('Timestamp when the container was launched'),
      endTimestamp: z.number().optional().describe('Timestamp when the container ended'),
      executionTime: z.number().optional().describe('Duration of execution in milliseconds'),
      consoleOutput: z.string().optional().describe('Console output from the execution'),
      resultObject: z.any().optional().describe('Result object returned by the Phantom')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let container = await client.fetchContainer(ctx.input.containerId);

    const consoleOutput = ctx.input.includeOutput
      ? text((await client.fetchContainerOutput(ctx.input.containerId))?.output)
      : undefined;
    const resultObject = ctx.input.includeResultObject
      ? await client.fetchContainerResultObject(ctx.input.containerId)
      : undefined;
    return {
      output: { ...execution(container), consoleOutput, resultObject },
      message: `Retrieved execution **${ctx.input.containerId}**.`
    };
  })
  .build();
