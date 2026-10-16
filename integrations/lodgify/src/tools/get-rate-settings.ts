import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRateSettings = SlateTool.create(spec, {
  name: 'Get Rate Settings',
  key: 'get_rate_settings',
  description:
    "Read a property's pricing settings, including currency, taxes, fees, promotions, booking window, and advance notice. Requires only the property ID, so no stay dates or room type are needed.",
  instructions: [
    'Use list_properties to discover property IDs.',
    'Use get_rates for nightly prices over a specific room type and date range. This tool reads pricing configuration only.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      propertyId: z.number().describe('Property ID. Call list_properties to discover IDs.')
    })
  )
  .output(
    z.object({
      propertyId: z.number().describe('The property whose pricing settings were read'),
      rateSettings: z
        .record(z.string(), z.any())
        .describe('Complete property pricing settings returned by Lodgify'),
      currencyCode: z
        .string()
        .optional()
        .describe('Currency code for property prices, when reported by Lodgify')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let rateSettings = await client.getRateSettings(ctx.input.propertyId);
    let currencyCode =
      typeof rateSettings?.currency_code === 'string' ? rateSettings.currency_code : undefined;

    return {
      output: { propertyId: ctx.input.propertyId, rateSettings, currencyCode },
      message: `Retrieved pricing settings for property **#${ctx.input.propertyId}**${currencyCode ? ` (${currencyCode})` : ''}.`
    };
  })
  .build();
