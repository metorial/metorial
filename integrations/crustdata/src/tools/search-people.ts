import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrustdataClient } from '../lib/client';
import { spec } from '../spec';

let peopleFilterSchema = z.object({
  filterType: z
    .string()
    .describe(
      'Filter type identifier. Options include: "CURRENT_COMPANY", "CURRENT_TITLE", "PAST_TITLE", "PAST_COMPANY", "SENIORITY_LEVEL", "FUNCTION", "REGION", "INDUSTRY", "COMPANY_HEADQUARTERS", "COMPANY_HEADCOUNT", "YEARS_AT_CURRENT_COMPANY", "YEARS_IN_CURRENT_POSITION", "YEARS_OF_EXPERIENCE", "PROFILE_LANGUAGE", "KEYWORD", "POSTED_ON_SOCIAL_MEDIA", "RECENTLY_CHANGED_JOBS", "IN_THE_NEWS".'
    ),
  type: z
    .string()
    .optional()
    .describe('Filter operator: "in", "not in", or "between". Omit for boolean filters.'),
  value: z
    .unknown()
    .optional()
    .describe(
      'Filter value. Arrays for "in"/"not in". Object with min/max for "between". Omit for boolean filters.'
    )
});

export let searchPeople = SlateTool.create(spec, {
  name: 'Search People',
  key: 'search_people',
  description: `Search for professional profiles using 20+ filters including title, company, seniority, location, function, and recent activity.
Find people who recently changed jobs, posted on social media, or match specific criteria.
Supports combining multiple filters for precise targeting.`,
  instructions: [
    'All filters are combined with AND logic.',
    'Boolean filters (POSTED_ON_SOCIAL_MEDIA, RECENTLY_CHANGED_JOBS, IN_THE_NEWS) only need filterType.',
    'SENIORITY_LEVEL values: "Owner", "Partner", "CXO", "Vice President", "Director", "Manager", "Senior", "Entry", "Training", "Unpaid".',
    'FUNCTION values include: "Accounting", "Engineering", "Sales", "Marketing", "Human Resources", "Operations", etc.'
  ],
  constraints: ['Returns up to 25 profiles per page.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filters: z.array(peopleFilterSchema).describe('Array of people search filters.'),
      page: z.number().optional().describe('Page number for pagination (starts at 1).')
    })
  )
  .output(
    z.object({
      profiles: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of matching person profiles.'),
      totalDisplayCount: z.number().optional().describe('Total number of matching profiles.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CrustdataClient(ctx.auth.token);

    let result = await client.searchPeople({
      filters: ctx.input.filters,
      page: ctx.input.page
    });

    let profiles = result.profiles ?? result.data ?? [];
    let totalDisplayCount = result.total_display_count ?? result.totalDisplayCount;

    return {
      output: { profiles, totalDisplayCount },
      message: `Found **${profiles.length}** profiles${totalDisplayCount ? ` (${totalDisplayCount} total)` : ''} matching filters.`
    };
  })
  .build();
