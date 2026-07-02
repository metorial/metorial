import { SlateTool } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let listProfiles = SlateTool.create(spec, {
  name: 'List Profiles',
  key: 'list_profiles',
  description: `List fundraising profiles (pages) within a campaign. Profiles represent individual or team fundraising pages. Filter by type (individual, team, or group), search by name, or filter by parent team.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignUuid: z.string().describe('UUID of the campaign'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of profiles to return (default 20)'),
      offset: z.number().optional().describe('Number of profiles to skip for pagination'),
      sort: z.string().optional().describe('Field to sort by, e.g. "createdAt", "total"'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      type: z
        .enum(['individual', 'team', 'group'])
        .optional()
        .describe('Filter by profile type'),
      search: z.string().optional().describe('Search profiles by name'),
      userUuid: z.string().optional().describe('Filter profiles by user UUID'),
      parentUuid: z.string().optional().describe('Filter profiles by parent profile UUID'),
      includePrivateData: z.boolean().optional().describe('Include private/custom field data')
    })
  )
  .output(
    z.object({
      profiles: z.array(z.record(z.string(), z.any())).describe('List of profile objects'),
      pagination: z
        .object({
          total: z.number().optional(),
          offset: z.number().optional(),
          limit: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new RaiselyClient({ token: ctx.auth.token });

    let result = await client.listProfiles(ctx.input.campaignUuid, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      order: ctx.input.order,
      type: ctx.input.type,
      q: ctx.input.search,
      user: ctx.input.userUuid,
      parent: ctx.input.parentUuid,
      private: ctx.input.includePrivateData
    });

    let profiles = result.data || [];
    let pagination = result.pagination;

    return {
      output: { profiles, pagination },
      message: `Found **${profiles.length}** profile(s) in campaign.`
    };
  })
  .build();
