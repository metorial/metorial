import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLicensee = SlateTool.create(spec, {
  name: 'Get Licensee',
  key: 'get_licensee',
  description:
    'Retrieve a licensee by its number. Use the corresponding list tool to discover identifiers.',
  tags: { readOnly: true }
})
  .input(z.object({ licenseeNumber: z.string().describe('Licensee number to retrieve') }))
  .output(
    z.object({
      licenseeNumber: z.string().describe('Licensee identifier'),
      productNumber: z.string().optional(),
      name: z.string().optional(),
      active: z.boolean().optional(),
      markedForTransfer: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).getLicensee(ctx.input.licenseeNumber);
    if (!result)
      throw createApiServiceError('The response did not contain the requested licensee.', {
        reason: 'invalid_response'
      });
    return {
      message: 'Requested licensing details retrieved.',
      output: {
        licenseeNumber: result.number,
        productNumber: result.productNumber,
        name: result.name,
        active: result.active,
        markedForTransfer: result.markedForTransfer
      }
    };
  })
  .build();
