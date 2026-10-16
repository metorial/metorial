import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/connect-client';
import { spec } from '../spec';

export let findStores = SlateTool.create(spec, {
  name: 'Find Stores',
  key: 'find_stores',
  description: `Find stores offering delivery, pickup, or last mile delivery near a location. Search by geographic coordinates, address, or postal code. Returns store names, location codes, and availability details.

Requires **Connect OAuth** authentication with the \`connect:fulfillment\` scope.`,
  instructions: [
    'Provide latitude/longitude for the most accurate results. Searching by postal code alone may not always be accurate.',
    'Save the returned locationCode to use when listing service options or creating orders.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fulfillmentType: z
        .enum(['delivery', 'pickup', 'last_mile'])
        .describe('Type of fulfillment to search for'),
      latitude: z.number().optional().describe('Latitude of the customer location'),
      longitude: z.number().optional().describe('Longitude of the customer location'),
      addressLine1: z.string().optional().describe('Street address to search by'),
      postalCode: z.string().optional().describe('Postal code to search by')
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .optional()
        .describe('Complete provider response, including coverage metadata'),
      stores: z
        .array(
          z.object({
            raw: z
              .unknown()
              .optional()
              .describe('Complete store data, including availability flags'),
            locationCode: z
              .string()
              .describe('Unique store location identifier used for creating orders'),
            name: z.string().describe('Store name'),
            address: z.string().optional().describe('Store address'),
            phone: z.string().optional().describe('Store phone number'),
            alcohol: z.boolean().describe('Whether the store offers alcohol'),
            pickupOnly: z.boolean().describe('Whether the store only supports pickup')
          })
        )
        .describe('List of available stores')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnectClient({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      baseUrl: ctx.auth.baseUrl
    });

    let { stores, raw } = await client.findStores(ctx.input);

    return {
      output: { stores, raw },
      message: `Found **${stores.length}** store(s) offering **${ctx.input.fulfillmentType}**.${stores.length > 0 ? `\n\n${stores.map(s => `- **${s.name}** (${s.locationCode})`).join('\n')}` : ''}`
    };
  })
  .build();
