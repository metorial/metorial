import { SlateTool } from 'slates';
import { z } from 'zod';
import { FalClient } from '../lib/client';
import { spec } from '../spec';

export const getModelPricing = SlateTool.create(spec, {
  name: 'Get Model Pricing',
  key: 'get_model_pricing',
  description:
    'Get the current unit price, billing unit, and currency for fal.ai model endpoints before running paid inference. Discover endpoint IDs with search_models. Final cost can depend on resolution, duration, and model-specific billing rules.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      endpointIds: z
        .array(z.string().min(1))
        .min(1)
        .max(50)
        .describe('Model endpoint IDs discovered with search_models')
    })
  )
  .output(
    z.object({
      prices: z.array(
        z.object({
          endpointId: z.string(),
          unitPrice: z.number(),
          unit: z.string(),
          currency: z.string()
        })
      ),
      nextCursor: z.string().nullable(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    const output = await new FalClient(ctx.auth.token).getModelPricing(ctx.input.endpointIds);
    return {
      output,
      message: `Retrieved pricing for ${output.prices.length} model endpoint(s).`
    };
  })
  .build();
