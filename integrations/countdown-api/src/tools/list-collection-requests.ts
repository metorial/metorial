import { SlateTool } from 'slates';
import { z } from 'zod';
import { CountdownClient, requireArray } from '../lib/client';
import { spec } from '../spec';

export let listCollectionRequests = SlateTool.create(spec, {
  key: 'list_collection_requests',
  name: 'List Collection Requests',
  description:
    'List a page of up to 1,000 requests in a collection, including provider request IDs and custom IDs. Call list_collections to discover collection IDs. Call sequentially to avoid rate limits.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      collectionId: z.string().describe('Collection ID from list_collections.'),
      page: z.number().optional().describe('Page starting at 1. Defaults to 1.')
    })
  )
  .output(
    z.object({
      requests: z.array(z.any()).describe('Requests with their provider IDs and parameters.'),
      currentPage: z.number().optional().describe('Provider current request page.'),
      totalPages: z.number().optional().describe('Provider request page count.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new CountdownClient(ctx.auth).listCollectionRequests(
      ctx.input.collectionId,
      ctx.input.page ?? 1
    );
    let requests = requireArray(result.requests, 'requests');
    return {
      output: {
        requests,
        currentPage: result.requests_page_current,
        totalPages: result.requests_page_count
      },
      message: `Retrieved ${requests.length} requests on this page.`
    };
  })
  .build();
