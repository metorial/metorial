import { SlateTool } from 'slates';
import { z } from 'zod';
import { FindymailClient } from '../lib/client';
import { spec } from '../spec';

export let getIntellimatchResults = SlateTool.create(spec, {
  name: 'Get IntelliMatch Search Results',
  key: 'get_intellimatch_results',
  description:
    'Retrieve one page of company and contact results from a completed IntelliMatch search. Obtain the hash from intellimatch_search and first confirm get_intellimatch_status reports success.',
  instructions: [
    'Use currentPage and lastPage to request subsequent pages until all results have been retrieved.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      hash: z
        .string()
        .min(1)
        .describe('Export hash returned by intellimatch_search as hash or searchId.'),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Results page, starting at 1. Defaults to 1.'),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Results per page, up to 500. Defaults to 100.')
    })
  )
  .output(
    z.object({
      hash: z.string().describe('Export hash for these results.'),
      results: z
        .array(
          z.object({
            id: z.string().optional().describe('Result identifier.'),
            name: z.string().optional().describe('Company name.'),
            domain: z.string().optional().describe('Company domain.'),
            description: z.string().optional().describe('Company description.'),
            employeeCountRange: z
              .string()
              .optional()
              .describe('Company employee count range.'),
            industries: z.array(z.string()).optional().describe('Company industries.'),
            country: z.string().optional().describe('Company country code.'),
            matchScore: z.number().optional().describe('Company match score.'),
            contactName: z.string().optional().describe('Contact name.'),
            contactEmail: z
              .string()
              .optional()
              .describe('Verified contact email, if requested and found.'),
            contactJobTitle: z.string().optional().describe('Contact job title.'),
            contactPhone: z
              .string()
              .optional()
              .describe('Contact phone number, if available.'),
            contactLinkedinUrl: z.string().optional().describe('Contact LinkedIn profile URL.')
          })
        )
        .describe('Company and contact results on this page.'),
      currentPage: z.number().describe('Current results page.'),
      perPage: z.number().describe('Results per page.'),
      total: z.number().describe('Total number of results across all pages.'),
      lastPage: z.number().describe('Last available results page.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FindymailClient({ token: ctx.auth.token });
    let result = await client.getIntellimatchData(ctx.input);
    let results = result.data.map(item => ({
      id: item.id?.toString(),
      name: item.name ?? undefined,
      domain: item.domain ?? undefined,
      description: item.description ?? undefined,
      employeeCountRange: item.employee_count_range ?? undefined,
      industries: item.industries ?? undefined,
      country: item.country ?? undefined,
      matchScore: item.match_score ?? undefined,
      contactName: item.contact_name ?? undefined,
      contactEmail: item.contact_email ?? undefined,
      contactJobTitle: item.contact_job_title ?? undefined,
      contactPhone: item.contact_phone ?? undefined,
      contactLinkedinUrl: item.contact_linkedin_url ?? undefined
    }));
    return {
      output: {
        hash: ctx.input.hash,
        results,
        currentPage: result.meta.current_page,
        perPage: result.meta.per_page,
        total: result.meta.total,
        lastPage: result.meta.last_page
      },
      message: `Retrieved **${results.length}** IntelliMatch result(s) on page ${result.meta.current_page} of ${result.meta.last_page}.`
    };
  })
  .build();
