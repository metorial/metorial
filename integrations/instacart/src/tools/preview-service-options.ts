import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/connect-client';
import { spec } from '../spec';

export let previewServiceOptions = SlateTool.create(spec, {
  name: 'Preview Service Options',
  key: 'preview_service_options',
  description: `Preview available delivery or pickup time slots before a customer has signed in or started shopping. Provides a preview of time windows based on postal code and anticipated shopper availability.

Requires **Connect OAuth** authentication with the \`connect:fulfillment\` scope.`,
  instructions: [
    'For pickup, provide locationCode from Find Stores with fulfillmentType pickup; the pickup API requires a store code.',
    'Use this for pre-login previews. For cart-based time slots with an existing user, use "List Cart Service Options" instead.',
    'Time slots are available first-come, first-served and may change by the time the customer checks out.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fulfillmentType: z.enum(['delivery', 'pickup']).describe('Type of fulfillment'),
      postalCode: z.string().describe('Postal code for the delivery or pickup location'),
      locationCode: z
        .string()
        .optional()
        .describe(
          'Store code required for pickup previews. Discover it with Find Stores using fulfillmentType pickup; ignored for delivery.'
        ),
      cartTotalCents: z.number().optional().describe('Total cart value in cents'),
      itemsCount: z.number().optional().describe('Number of items in the order'),
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
                type: z.string().describe('Type of window (e.g., "scheduled", "immediate")'),
                asap: z
                  .boolean()
                  .optional()
                  .describe('Whether this is an ASAP delivery option')
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

    let { serviceOptions, raw } = await client.previewServiceOptions(ctx.input);

    let availableCount = serviceOptions.filter(o => o.available).length;
    return {
      output: { serviceOptions, raw },
      message: `Found **${serviceOptions.length}** service option(s) for **${ctx.input.fulfillmentType}** near **${ctx.input.postalCode}** (${availableCount} available).`
    };
  })
  .build();
