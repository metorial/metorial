import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getShippingSettings = SlateTool.create(spec, {
  key: 'get_shipping_settings',
  name: 'Get Shipping Settings',
  description:
    'Discover delivery methods and shipping option IDs, prices, and country restrictions for create_order.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z
      .object({
        enableDigitalFulfilment: z.boolean(),
        enableSelfFulfilledPostal: z.boolean(),
        enablePostalMessage: z.boolean(),
        postalShippingOptions: z.array(
          z.object({ id: z.string(), name: z.string(), price: z.number() }).passthrough()
        )
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let settings = await new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    }).getShippingSettings();
    return {
      output: settings,
      message: `Retrieved shipping settings and ${settings.postalShippingOptions.length} shipping options.`
    };
  })
  .build();
