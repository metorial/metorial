import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let bulkGetCases = SlateTool.create(spec, {
  name: 'Bulk Get Cases',
  key: 'bulk_get_cases',
  description:
    'Retrieve specific CommCare cases in one request using case IDs, external IDs, or both. Missing cases are returned as error records alongside the cases that were found.',
  instructions: [
    'Provide at least one case ID or external ID. Results for case IDs appear first, followed by results for external IDs.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      caseIds: z
        .array(z.string())
        .optional()
        .describe('Case IDs to retrieve. Discover IDs with list_cases.'),
      externalIds: z
        .array(z.string())
        .optional()
        .describe('External system IDs associated with the cases.')
    })
  )
  .output(
    z.object({
      cases: z.array(z.record(z.string(), z.unknown())),
      matchingCount: z.number(),
      missingCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      domain: ctx.config.domain,
      username: ctx.auth.username,
      token: ctx.auth.token
    });
    let result = await client.bulkGetCases(ctx.input);
    return {
      output: {
        cases: result.cases,
        matchingCount: result.matching_records,
        missingCount: result.missing_records
      },
      message: `Retrieved **${result.matching_records}** cases; **${result.missing_records}** requested records were not found.`
    };
  })
  .build();
