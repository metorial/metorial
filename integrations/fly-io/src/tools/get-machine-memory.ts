import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getMachineMemory = SlateTool.create(spec, {
  name: 'Get Machine Memory',
  key: 'get_machine_memory',
  description: 'Get the current memory limit and available capacity for a Fly Machine.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App'),
      machineId: z.string().describe('ID of the Fly Machine')
    })
  )
  .output(
    z.object({
      limitMb: z.number().describe('Current machine memory limit in MB'),
      availableMb: z.number().describe('Available memory capacity in MB')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let memory = await client.getMachineMemory(ctx.input.appName, ctx.input.machineId);

    return {
      output: memory,
      message: `Machine **${ctx.input.machineId}** has **${memory.limitMb} MB** memory limit and **${memory.availableMb} MB** available.`
    };
  })
  .build();
