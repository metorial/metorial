import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageMachineMetadata = SlateTool.create(spec, {
  name: 'Manage Machine Metadata',
  key: 'manage_machine_metadata',
  description: `Get, set, or delete metadata key-value pairs on a Fly Machine. Metadata can be used for tagging, filtering, and internal routing purposes.`,
  instructions: [
    'Use "get" to retrieve all metadata for a machine.',
    'Use "set" to add or update a metadata key-value pair.',
    'Use "delete" to remove a specific metadata key.'
  ]
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App'),
      machineId: z.string().describe('ID of the machine'),
      action: z.enum(['get', 'set', 'delete']).describe('Metadata action to perform'),
      key: z.string().optional().describe('Metadata key (required for set and delete)'),
      value: z.string().optional().describe('Metadata value (required for set)')
    })
  )
  .output(
    z.object({
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('All metadata key-value pairs (for get action)'),
      updated: z
        .boolean()
        .optional()
        .describe('Whether metadata was updated (for set action)'),
      deleted: z.boolean().optional().describe('Whether metadata key was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { appName, machineId, action } = ctx.input;

    switch (action) {
      case 'get': {
        let metadata = await client.getMachineMetadata(appName, machineId);
        let count = Object.keys(metadata).length;
        return {
          output: { metadata },
          message: `Machine **${machineId}** has **${count}** metadata key(s).`
        };
      }
      case 'set': {
        if (!ctx.input.key) throw new Error('key is required for set action');
        if (ctx.input.value === undefined) throw new Error('value is required for set action');
        await client.setMachineMetadata(appName, machineId, ctx.input.key, ctx.input.value);
        return {
          output: { updated: true },
          message: `Set metadata **${ctx.input.key}** on machine **${machineId}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.key) throw new Error('key is required for delete action');
        await client.deleteMachineMetadata(appName, machineId, ctx.input.key);
        return {
          output: { deleted: true },
          message: `Deleted metadata key **${ctx.input.key}** from machine **${machineId}**.`
        };
      }
    }
  })
  .build();
