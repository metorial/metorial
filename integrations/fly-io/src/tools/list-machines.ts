import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listMachines = SlateTool.create(spec, {
  name: 'List Machines',
  key: 'list_machines',
  description: `List all Fly Machines in an app. Optionally filter by region or metadata. Returns machine IDs, states, regions, and configuration details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App'),
      includeDeleted: z.boolean().optional().describe('Include deleted machines in results'),
      region: z
        .string()
        .optional()
        .describe('Filter machines by region code (e.g. "ord", "lhr", "sin")')
    })
  )
  .output(
    z.object({
      machines: z
        .array(
          z.object({
            machineId: z.string().describe('Unique machine identifier'),
            machineName: z.string().describe('Name of the machine'),
            state: z
              .string()
              .describe('Current state (started, stopped, suspended, destroyed, etc.)'),
            region: z.string().describe('Region code where the machine is deployed'),
            instanceId: z.string().describe('Current instance ID'),
            privateIp: z.string().describe('Private IPv6 address'),
            imageRef: z.record(z.string(), z.any()).describe('Container image reference'),
            createdAt: z.string().describe('When the machine was created'),
            updatedAt: z.string().describe('When the machine was last updated')
          })
        )
        .describe('List of machines')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let machines = await client.listMachines(ctx.input.appName, {
      includeDeleted: ctx.input.includeDeleted,
      region: ctx.input.region
    });

    let machinesSummary = machines.map(m => ({
      machineId: m.machineId,
      machineName: m.machineName,
      state: m.state,
      region: m.region,
      instanceId: m.instanceId,
      privateIp: m.privateIp,
      imageRef: m.imageRef,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt
    }));

    return {
      output: { machines: machinesSummary },
      message: `Found **${machines.length}** machine(s) in app **${ctx.input.appName}**${ctx.input.region ? ` (region: ${ctx.input.region})` : ''}.`
    };
  })
  .build();
