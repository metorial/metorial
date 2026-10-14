import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, getAppcircleList } from '../lib/helpers';
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
          configurationName: z.string().nullish(),
          platformType: z.string().optional(),
          autoBuild: z.boolean().nullish(),
          autoDistribute: z.boolean().nullish(),
          autoPublish: z.boolean().nullish()
        })
        .passthrough()
    )
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let configs = await client.listConfigurations(ctx.input.profileId, ctx.input.branchId);

    let items = getAppcircleList(configs, 'list');

    return {
      output: items.map(item => ({
        ...item,
        platformType: item.platformType == null ? undefined : String(item.platformType)
      })),
      message: `Found **${items.length}** configuration(s) for profile **${ctx.input.profileId}**.`
    };
  })
  .build();
