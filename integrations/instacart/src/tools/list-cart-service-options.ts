import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/connect-client';
import { spec } from '../spec';

let cartItemSchema = z.object({
  item: z
    .object({ upc: z.string().optional(), rrc: z.string().optional() })
    .optional()
    .describe('Current item code; specify exactly one UPC or retailer reference code'),
  weight: z.number().optional().describe('Weight in the product catalog unit'),
  lineNum: z.string().describe('Line number identifier for the item'),
  count: z.number().describe('Quantity of the item'),
  productCodes: z
    .array(
      z.object({
        type: z.string().describe('Product code type ("upc" or "rrc")'),
        value: z.string().describe('Product code value')
      })
    )
    .optional()
    .describe('Product identification codes')
});

export let listCartServiceOptions = SlateTool.create(spec, {
  name: 'List Cart Service Options',
  key: 'list_cart_service_options',
  description: `List available delivery or pickup time slots for a specific user and cart. Unlike preview service options, this uses the customer's actual cart items and store location to provide accurate availability, including item-specific restrictions (e.g., alcohol delivery windows).

Requires **Connect OAuth** authentication with the \`connect:fulfillment\` scope.`,
  instructions: [
    'Include all cart items for the most accurate availability results.',
    'Save the serviceOptionId or serviceOptionReference to reserve the time slot.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('Connect user ID'),
      fulfillmentType: z.enum(['delivery', 'pickup']).describe('Type of fulfillment'),
      address: z
        .object({
          addressLine1: z.string(),
          addressLine2: z.string().optional(),
          addressType: z.string().optional(),
          postalCode: z.string(),
          city: z.string().optional()
        })
        .optional()
        .describe('Delivery address required by the delivery API'),
      locationCode: z.string().describe('Store location code from the Find Stores tool'),
      items: z
        .array(cartItemSchema)
        .optional()
        .describe('Cart items to check availability against'),
      desiredWindows: z
        .array(z.object({ startsAt: z.string(), endsAt: z.string() }))
        .optional()
        .describe('Requested ISO 8601 windows; delivery only'),
      withEtaOptions: z.boolean().optional().describe('Whether to include ETA time slots'),
      withPriorityEtaOptions: z
        .boolean()
        .optional()
        .describe('Whether to include priority ETA time slots')
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .optional()
        .describe('Complete provider response, including warnings and address flags'),
      serviceOptions: z
        .array(
          z.object({
            raw: z.unknown().optional().describe('Complete service option data'),
            serviceOptionId: z.string().describe('Unique ID for this service option'),
            serviceOptionReference: z
              .string()
              .optional()
              .describe('Reference identifier for reserving this slot'),
            date: z.string().describe('Date for this time slot'),
            window: z
              .object({
                immediateHour: z
                  .number()
                  .optional()
                  .describe('Hours from order creation for immediate time slots'),
                startAt: z.string().optional().describe('Window start time (ISO 8601)'),
                endAt: z.string().optional().describe('Window end time (ISO 8601)'),
                type: z.string().describe('Type of window'),
                asap: z.boolean().optional().describe('Whether this is an ASAP option')
              })
              .describe('Time window details'),
            available: z.boolean().describe('Whether this time slot is currently available')
          })
        )
        .describe('Available service options / time slots')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnectClient({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      baseUrl: ctx.auth.baseUrl
    });

    let { serviceOptions, raw } = await client.listCartServiceOptions(ctx.input);

    let availableCount = serviceOptions.filter(o => o.available).length;
    return {
      output: { serviceOptions, raw },
      message: `Found **${serviceOptions.length}** service option(s) for user **${ctx.input.userId}** at store **${ctx.input.locationCode}** (${availableCount} available).`
    };
  })
  .build();
