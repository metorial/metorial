import { SlateTool } from 'slates';
import { z } from 'zod';
import { optionalNumber, providerList, ReviewExpressClient } from '../lib/client';
import { spec } from '../spec';

export let listReviewRequests = SlateTool.create(spec, {
  name: 'List Review Requests',
  key: 'list_review_requests',
  description:
    'Read Review Express email requests by mapped partner property ID, Tripadvisor request ID, or your partner request reference. Returns the provider records, including scheduled email status and guest details.',
  instructions: [
    'Provide exactly one lookup field. Call list_location_mappings to discover the mapped partner property ID.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      locationId: z
        .string()
        .optional()
        .describe('Mapped partner property ID from list_location_mappings.'),
      requestId: z.number().optional().describe('Tripadvisor email request ID.'),
      partnerRequestId: z
        .string()
        .optional()
        .describe('Your reference supplied when creating the email request.')
    })
  )
  .output(
    z.object({
      requests: z.array(z.record(z.string(), z.unknown())),
      totalResults: z.number().optional(),
      returnedResults: z.number().optional(),
      skipped: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReviewExpressClient({
      token: ctx.auth.reviewExpressToken ?? ctx.auth.token
    });
    let result = await client.listEmailRequests(ctx.input);
    let requests = providerList(
      Array.isArray(result)
        ? result
        : (result?.data ?? (result?.request_id !== undefined ? [result] : undefined))
    );
    return {
      output: {
        requests,
        totalResults: optionalNumber(result?.paging?.total_results),
        returnedResults: optionalNumber(result?.paging?.results),
        skipped: optionalNumber(result?.paging?.skipped)
      },
      message: `Retrieved ${requests.length} review email request(s).`
    };
  })
  .build();
