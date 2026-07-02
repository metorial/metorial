import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listMachineVersions = SlateTool.create(spec, {
  name: 'List Machine Versions',
  key: 'list_machine_versions',
  description:
    'List historical configuration versions for a Fly Machine. Use this before rollback or audit workflows.',
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
      versions: z
        .array(
          z.object({
            version: z.string().describe('Machine config version'),
            userConfig: z.record(z.string(), z.any()).describe('User machine config')
          })
        )
        .describe('Machine versions')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let versions = await client.listMachineVersions(ctx.input.appName, ctx.input.machineId);

    return {
      output: { versions },
      message: `Found **${versions.length}** version(s) for machine **${ctx.input.machineId}**.`
    };
  })
  .build();
