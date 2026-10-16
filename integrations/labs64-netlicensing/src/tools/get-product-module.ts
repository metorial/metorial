import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProductModule = SlateTool.create(spec, {
  name: 'Get Product Module',
  key: 'get_product_module',
  description:
    'Retrieve a product module by its number. Use the corresponding list tool to discover identifiers.',
  tags: { readOnly: true }
})
  .input(
    z.object({ productModuleNumber: z.string().describe('Product Module number to retrieve') })
  )
  .output(
    z.object({
      productModuleNumber: z.string().describe('Product Module identifier'),
      productNumber: z.string().optional(),
      name: z.string().optional(),
      active: z.boolean().optional(),
      licensingModel: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).getProductModule(
      ctx.input.productModuleNumber
    );
    if (!result)
      throw createApiServiceError(
        'The response did not contain the requested product module.',
        { reason: 'invalid_response' }
      );
    return {
      message: 'Requested licensing details retrieved.',
      output: {
        productModuleNumber: result.number,
        productNumber: result.productNumber,
        name: result.name,
        active: result.active,
        licensingModel: result.licensingModel
      }
    };
  })
  .build();
