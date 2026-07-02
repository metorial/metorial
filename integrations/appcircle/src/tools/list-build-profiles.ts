import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listBuildProfiles = SlateTool.create(spec, {
  name: 'List Build Profiles',
  key: 'list_build_profiles',
  description: `Retrieves all build profiles in the organization. Build profiles represent connected repositories and their build configurations. Use this to discover available profiles before triggering builds.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term to filter profiles by name'),
      page: z.number().optional().describe('Page number for pagination'),
      size: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.array(
      z
        .object({
          profileId: z.string().optional(),
          name: z.string().optional(),
          pinned: z.boolean().optional(),
          repositoryConnected: z.boolean().optional(),
          platformType: z.string().optional(),
          lastBuildDate: z.string().optional()
        })
        .passthrough()
    )
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let profiles = await client.listBuildProfiles({
      search: ctx.input.search,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let items = Array.isArray(profiles) ? profiles : [];

    return {
      output: items,
      message: `Found **${items.length}** build profile(s).`
    };
  })
  .build();
