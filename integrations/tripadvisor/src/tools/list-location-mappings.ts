import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  optionalNumber,
  optionalString,
  providerList,
  ReviewExpressClient
} from '../lib/client';
import { spec } from '../spec';

export let listLocationMappings = SlateTool.create(spec, {
  name: 'List Location Mappings',
  key: 'list_location_mappings',
  description:
    'Discover mapped Review Express hotel properties, their partner property IDs, Tripadvisor IDs, and actual opt-in status. Optionally select one partner property or filter all mappings by opt-in state. Includes the original provider property metadata.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      partnerId: z
        .string()
        .optional()
        .describe('Optional partner property ID to retrieve one mapping.'),
      optedIn: z
        .boolean()
        .optional()
        .describe('Optional opt-in filter when listing mapped properties.')
    })
  )
  .output(
    z.object({
      locations: z.array(
        z.object({
          partnerId: z.string().optional(),
          tripadvisorId: z.string().optional(),
          optedIn: z.boolean().optional(),
          raw: z.record(z.string(), z.unknown())
        })
      ),
      totalResults: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReviewExpressClient({
      token: ctx.auth.reviewExpressToken ?? ctx.auth.token
    });
    let result = await client.listLocationMappings(ctx.input);
    let locations = providerList(result?.data?.locations).map(location => ({
      partnerId: optionalString(location.partner_id),
      tripadvisorId: optionalString(location.tripadvisor_id),
      optedIn:
        typeof location.review_express_opted_in === 'boolean'
          ? location.review_express_opted_in
          : undefined,
      raw: location
    }));
    return {
      output: { locations, totalResults: optionalNumber(result?.paging?.total_results) },
      message: `Retrieved ${locations.length} mapped hotel property record(s).`
    };
  })
  .build();
