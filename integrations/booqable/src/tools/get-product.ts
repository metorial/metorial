import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenSingleResource } from '../lib/helpers';
import { spec } from '../spec';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve a single product group by ID, including its product variations and pricing details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productGroupId: z.string().describe('The unique ID of the product group to retrieve')
    })
  )
  .output(
    z.object({
      productGroup: z
        .record(z.string(), z.any())
        .describe('The product group record with all attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    let response = await client.getProductGroup(ctx.input.productGroupId, [
      'products',
      'photos'
    ]);
    let productGroup = flattenSingleResource(response);

    return {
      output: { productGroup },
      message: `Retrieved product group **${productGroup?.name || ctx.input.productGroupId}**.`
    };
  })
  .build();
