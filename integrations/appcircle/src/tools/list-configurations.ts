import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listConfigurations = SlateTool.create(spec, {
  name: 'List Build Configurations',
  key: 'list_configurations',
  description: `Retrieves all build configurations for a build profile. Configurations define platform settings, signing identities, auto-build triggers, and distribution settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      profileId: z.string().describe('ID of the build profile'),
      branchId: z.string().optional().describe('Optionally filter configurations by branch ID')
    })
  )
  .output(
    z.array(
      z
        .object({
          configurationId: z.string().optional(),
          configurationName: z.string().optional(),
          platformType: z.string().optional(),
          autoBuild: z.boolean().optional(),
          autoDistribute: z.boolean().optional(),
          autoPublish: z.boolean().optional()
        })
        .passthrough()
    )
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let configs = await client.listConfigurations(ctx.input.profileId, ctx.input.branchId);

    let items = Array.isArray(configs) ? configs : [];

    return {
      output: items,
      message: `Found **${items.length}** configuration(s) for profile **${ctx.input.profileId}**.`
    };
  })
  .build();
