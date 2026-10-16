import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { shoppingRequestId } from '../lib/shopping';
import { spec } from '../spec';

export let submitGoogleShoppingSearch = SlateTool.create(spec, {
  key: 'submit_google_shopping_search',
  name: 'Submit Google Shopping Search',
  description:
    'Start an asynchronous Google Shopping ad search and return its request ID immediately. Use Get Google Shopping Status to retrieve the results without submitting another search.',
  instructions: ['Provide a bare company domain such as example.com.'],
  constraints: ['The initial search consumes one credit; checking its status is free.'],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      companyDomain: z.string().describe('Company website domain, such as example.com')
    })
  )
  .output(z.object({ requestId: z.string(), rawResponse: z.unknown().optional() }))
  .handleInvocation(async ctx => {
    let response = await new Client(ctx.auth).submitGoogleShoppingSearch(ctx.input);
    let requestId = shoppingRequestId(response);
    return {
      output: { requestId, rawResponse: response },
      message: `Submitted Google Shopping search. Use request ID **${requestId}** with Get Google Shopping Status.`
    };
  })
  .build();
