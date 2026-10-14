import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, getAppcircleList } from '../lib/helpers';
import { spec } from '../spec';

export let listCommits = SlateTool.create(spec, {
  name: 'List Commits',
  key: 'list_commits',
  description:
    'Lists commits for a build profile and branch so you can inspect commit IDs and build history.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      profileId: z
        .string()
        .describe('Build profile ID. Use list_build_profiles to discover it.'),
      branchId: z.string().describe('Branch ID from get_build_profile.'),
      page: z.number().optional().describe('Page number for pagination'),
      size: z.number().optional().describe('Number of results per page')
    })
  )
  .output(z.array(z.any()))
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = getAppcircleList(
      await client.listCommits(ctx.input.profileId, ctx.input.branchId, {
        page: ctx.input.page,
        size: ctx.input.size
      }),
      'commits'
    );
    return { output: result, message: 'Retrieved list commits information.' };
  })
  .build();
