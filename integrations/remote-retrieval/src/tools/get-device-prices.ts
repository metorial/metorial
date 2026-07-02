import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let devicePriceSchema = z.object({
  equipmentType: z
    .string()
    .describe('Type of equipment (Laptop, Monitor, Monitor_27, Tablet, Cell Phone)'),
  orderAmount: z.number().describe('Price amount in dollars'),
  optionLabel: z.string().describe('Display label with price (e.g. "Laptop($77)")')
});

export let getDevicePrices = SlateTool.create(spec, {
  name: 'Get Device Prices',
  key: 'get_device_prices',
  description: `Retrieve real-time pricing for all supported equipment return types. Monitor prices are split into standard (17–23 inches) and Monitor_27 (24–27 inches) categories.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      prices: z.array(devicePriceSchema).describe('Pricing for each supported equipment type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getDevicePrices();

    let prices = (Array.isArray(result) ? result : []).map((item: any) => ({
      equipmentType: item.equipment_type || '',
      orderAmount: item.order_amount || 0,
      optionLabel: item.option_lbl || ''
    }));

    let summary = prices.map(p => `${p.equipmentType}: $${p.orderAmount}`).join(', ');

    return {
      output: {
        prices
      },
      message: `Current device return prices: ${summary}.`
    };
  })
  .build();
