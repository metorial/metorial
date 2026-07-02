import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getMachine = SlateTool.create(spec, {
  name: 'Get Machine',
  key: 'get_machine',
  description: `Retrieve full details of a specific Fly Machine including its configuration, state, events, and image reference.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App'),
      machineId: z.string().describe('ID of the machine to retrieve')
    })
  )
  .output(
    z.object({
      machineId: z.string().describe('Unique machine identifier'),
      machineName: z.string().describe('Name of the machine'),
      state: z
        .string()
        .describe('Current state (started, stopped, suspended, destroyed, etc.)'),
      region: z.string().describe('Region code'),
      instanceId: z.string().describe('Current instance ID'),
      privateIp: z.string().describe('Private IPv6 address'),
      config: z.record(z.string(), z.any()).describe('Full machine configuration'),
      imageRef: z.record(z.string(), z.any()).describe('Container image reference'),
      createdAt: z.string().describe('When the machine was created'),
      updatedAt: z.string().describe('When the machine was last updated'),
      events: z.array(z.record(z.string(), z.any())).describe('Recent machine events')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let machine = await client.getMachine(ctx.input.appName, ctx.input.machineId);

    return {
      output: machine,
      message: `Machine **${machine.machineName || machine.machineId}** is in **${machine.state}** state in region **${machine.region}**.`
    };
  })
  .build();
