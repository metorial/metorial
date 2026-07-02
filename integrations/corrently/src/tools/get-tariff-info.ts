import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTariffInfo = SlateTool.create(spec, {
  name: 'Tariff Components',
  key: 'get_tariff_info',
  description: `Provides a breakdown of energy tariff cost components for a German postal code. Shows different cost elements that make up the electricity price, useful for understanding the composition of energy costs and identifying savings opportunities.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      zip: z.string().describe('German postal code (Postleitzahl), 5 digits'),
      annualConsumptionKwh: z
        .number()
        .optional()
        .describe('Annual energy consumption in kWh for cost calculation')
    })
  )
  .output(
    z.object({
      components: z
        .array(
          z.object({
            description: z.string().optional().describe('Cost component description'),
            unitPrice: z.number().optional().describe('Price per unit'),
            totalSum: z.number().optional().describe('Total sum in EUR'),
            frequency: z
              .string()
              .optional()
              .describe('Frequency or dependency of the component')
          })
        )
        .optional()
        .describe('Tariff cost components')
    })
  )
  .handleInvocation(async ctx => {
    let zip = ctx.input.zip || ctx.config.zip;
    if (!zip) {
      throw new Error('A German postal code (zip) is required.');
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.getTariffComponents({
      zipcode: zip,
      kwha: ctx.input.annualConsumptionKwh
    });

    let components = (result.components || []).map(comp => ({
      description: comp.describtion,
      unitPrice: comp.per,
      totalSum: comp.sum,
      frequency: comp.mutlityplier
    }));

    return {
      output: { components },
      message: `Retrieved **${components.length}** tariff components for postal code **${zip}**.`
    };
  })
  .build();
