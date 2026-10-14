import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { modelingRequestSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getModelingRequest = SlateTool.create(spec, {
  name: 'Get Modeling Request',
  key: 'get_modeling_request',
  description:
    'Retrieve a modeling request by its ID or SKU, including production status, associated product, and customer review details when available. Call list_modeling_requests to discover request IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      idOrSku: z
        .string()
        .describe('Modeling request ID or SKU. Call list_modeling_requests to find requests.')
    })
  )
  .output(
    z.object({
      modelingRequest: modelingRequestSchema.describe(
        'Modeling request ID and provider attributes.'
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getModelingRequest(ctx.input.idOrSku);
    return {
      output: { modelingRequest: result.data },
      message: `Retrieved modeling request **${result.data.attributes.title || result.data.id}** (ID: \`${result.data.id}\`).`
    };
  })
  .build();
