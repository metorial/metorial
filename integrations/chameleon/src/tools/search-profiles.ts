import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

export let searchProfiles = SlateTool.create(spec, {
  name: 'Search User Profiles',
  key: 'search_profiles',
  description: `Search and list Chameleon user profiles using filters or segment targeting.
Supports filtering by user properties, tour interactions, survey responses, and more.
Can also count matching profiles without returning full data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      segmentId: z.string().optional().describe('Chameleon Segment ID to filter profiles by'),
      filters: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe(
          'Array of segmentation filter expressions (e.g. [{"kind":"property","prop":"email","op":"eq","value":"user@example.com"}])'
        ),
      filtersOp: z
        .enum(['and', 'or'])
        .optional()
        .describe('Logical operator joining filters. Defaults to "and"'),
      countOnly: z
        .boolean()
        .optional()
        .describe('If true, only return the count of matching profiles'),
      limit: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .describe('Number of profiles to return (1-500, default 50)'),
      before: z.string().optional().describe('Pagination cursor for older items'),
      after: z.string().optional().describe('Pagination cursor for newer items'),
      expandProfile: z
        .enum(['all', 'min'])
        .optional()
        .describe('Level of profile detail: "all" for full properties, "min" for minimal'),
      expandCompany: z
        .enum(['all', 'min', 'skip'])
        .optional()
        .describe('Level of company detail: "all", "min", or "skip"')
    })
  )
  .output(
    z.object({
      profiles: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of matching user profiles'),
      count: z
        .number()
        .optional()
        .describe('Count of matching profiles (when countOnly is true)'),
      cursor: z
        .object({
          limit: z.number().optional(),
          before: z.string().optional()
        })
        .optional()
        .describe('Pagination cursor for fetching more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);

    if (ctx.input.countOnly) {
      let result = await client.countProfiles({
        segmentId: ctx.input.segmentId,
        filters: ctx.input.filters,
        filtersOp: ctx.input.filtersOp
      });
      return {
        output: { count: result.count },
        message: `Found **${result.count}** matching profiles.`
      };
    }

    let expand: { profile?: string; company?: string } | undefined;
    if (ctx.input.expandProfile || ctx.input.expandCompany) {
      expand = {};
      if (ctx.input.expandProfile) expand.profile = ctx.input.expandProfile;
      if (ctx.input.expandCompany) expand.company = ctx.input.expandCompany;
    }

    let result = await client.listProfiles({
      segmentId: ctx.input.segmentId,
      filters: ctx.input.filters,
      filtersOp: ctx.input.filtersOp,
      limit: ctx.input.limit,
      before: ctx.input.before,
      after: ctx.input.after,
      expand
    });

    let profiles = result.profiles || [];
    return {
      output: {
        profiles,
        cursor: result.cursor
      },
      message: `Returned **${profiles.length}** user profiles.`
    };
  })
  .build();
