import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let shippingMethodSchema = z.object({
  methodId: z.string(),
  title: z.string(),
  description: z.string()
});

export let getShippingMethods = SlateTool.create(spec, {
  name: 'Get Shipping Methods',
  key: 'get_shipping_methods',
  description: `List available WooCommerce shipping methods, or retrieve one method by ID. Use these method IDs when adding methods to shipping zones.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      methodId: z
        .string()
        .optional()
        .describe('Shipping method ID to retrieve. Omit to list all methods.')
    })
  )
  .output(
    z.object({
      methods: z.array(shippingMethodSchema).optional(),
      method: shippingMethodSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.methodId) {
      let method = await client.getShippingMethod(ctx.input.methodId);
      return {
        output: { method: mapShippingMethod(method) },
        message: `Retrieved shipping method **"${method.title || method.id}"**.`
      };
    }

    let methods = await client.listShippingMethods();
    let mapped = (Array.isArray(methods) ? methods : []).map((method: any) =>
      mapShippingMethod(method)
    );

    return {
      output: { methods: mapped },
      message: `Found **${mapped.length}** shipping methods.`
    };
  })
  .build();

let mapShippingMethod = (method: any) => ({
  methodId: method.id || '',
  title: method.title || '',
  description: method.description || ''
});
