import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBundle = SlateTool.create(spec, {
  name: 'Get Bundle',
  key: 'get_bundle',
  description:
    'Retrieve a bundle by its number. Use the corresponding list tool to discover identifiers.',
  tags: { readOnly: true }
})
  .input(z.object({ bundleNumber: z.string().describe('Bundle number to retrieve') }))
  .output(
    z.object({
      bundleNumber: z.string().describe('Bundle identifier'),
      name: z.string().optional(),
      active: z.boolean().optional(),
      description: z.string().optional(),
      price: z.number().optional(),
      currency: z.string().optional(),
      licenseTemplatesNumbers: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).getBundle(ctx.input.bundleNumber);
    if (!result)
      throw createApiServiceError('The response did not contain the requested bundle.', {
        reason: 'invalid_response'
      });
    return {
      message: 'Requested licensing details retrieved.',
      output: {
        bundleNumber: result.number,
        name: result.name,
        active: result.active,
        description: result.description,
        price: result.price,
        currency: result.currency,
        licenseTemplatesNumbers: result.licenseTemplatesNumbers
      }
    };
  })
  .build();
