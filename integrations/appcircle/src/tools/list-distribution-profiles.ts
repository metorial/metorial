import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listDistributionProfiles = SlateTool.create(spec, {
  name: 'List Distribution Profiles',
  key: 'list_distribution_profiles',
  description: `Retrieves all testing distribution profiles. Distribution profiles are used to share app builds with testers via email, QR codes, or direct links.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term to filter profiles'),
      page: z.number().optional().describe('Page number for pagination'),
      size: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.array(
      z
        .object({
          profileId: z.string().optional(),
          name: z.string().optional()
        })
        .passthrough()
    )
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let profiles = await client.listDistributionProfiles({
      search: ctx.input.search,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let items = Array.isArray(profiles) ? profiles : [];

    return {
      output: items,
      message: `Found **${items.length}** distribution profile(s).`
    };
  })
  .build();
