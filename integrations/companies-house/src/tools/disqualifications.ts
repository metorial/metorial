import { SlateTool } from 'slates';
import { z } from 'zod';
import { CompaniesHouseClient } from '../lib/client';
import {
  disqualifiedOfficerSearchOutputSchema,
  officerDisqualificationsOutputSchema,
  officerIdSchema,
  paginationFields,
  querySchema
} from '../lib/schemas';
import { spec } from '../spec';

export let searchDisqualifiedOfficers = SlateTool.create(spec, {
  name: 'Search Disqualified Officers',
  key: 'search_disqualified_officers',
  description:
    'Search Companies House disqualified officer records by name and return links to published disqualification details.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      query: querySchema.describe('Natural person or corporate officer name to search for.'),
      ...paginationFields
    })
  )
  .output(disqualifiedOfficerSearchOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new CompaniesHouseClient(ctx.auth).searchDisqualifiedOfficers(
      ctx.input
    );
    return {
      output: result,
      message: `Found **${result.totalResults}** matching disqualified officers.`
    };
  })
  .build();

export let getOfficerDisqualifications = SlateTool.create(spec, {
  name: 'Get Officer Disqualifications',
  key: 'get_officer_disqualifications',
  description:
    'Get published Companies House disqualifications and permissions to act for a natural or corporate officer record.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      officerType: z
        .enum(['natural', 'corporate'])
        .describe('Officer record type returned by search_disqualified_officers.'),
      officerId: officerIdSchema.describe(
        'Officer ID returned by search_disqualified_officers.'
      )
    })
  )
  .output(officerDisqualificationsOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new CompaniesHouseClient(ctx.auth).getOfficerDisqualifications(
      ctx.input.officerId,
      ctx.input.officerType
    );
    return {
      output: result,
      message: `Retrieved disqualification records for **${result.name}**.`
    };
  })
  .build();
