import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/connect-client';
import { spec } from '../spec';

export let reserveServiceOption = SlateTool.create(spec, {
  name: 'Reserve Service Option',
  key: 'reserve_service_option',
  description: `Reserve a delivery or pickup time slot for a Connect user. The reservation holds the time slot for 10 minutes. Use the returned serviceOptionHoldId when creating an order. A user can only have one active reservation at a time.

Requires **Connect OAuth** authentication with the \`connect:fulfillment\` scope.`,
  instructions: [
    'Use "List Cart Service Options" to get available serviceOptionIds first.',
    'Reservations expire after 10 minutes — send the reservation request near the end of checkout.',
    'A new reservation for the same user cancels any previous reservation.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('Connect user ID'),
      serviceOptionId: z
        .string()
        .describe('Service option ID to reserve (from List Cart Service Options)'),
      locationCode: z.string().describe('Store location code'),
      items: z
        .array(
          z.object({
            lineNum: z.string().describe('Line number identifier for the item'),
            count: z.number().describe('Quantity of the item'),
            productCodes: z
              .array(
                z.object({
                  type: z.string().describe('Product code type'),
                  value: z.string().describe('Product code value')
                })
              )
              .optional()
              .describe('Product identification codes')
          })
        )
        .optional()
        .describe('Cart items to validate against the time slot')
    })
  )
  .output(
    z.object({
      serviceOptionHoldId: z
        .number()
        .describe('Reservation hold ID to use when creating an order'),
      expiresAt: z.string().describe('When the reservation expires (ISO 8601)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnectClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.reserveServiceOption(
      ctx.input.userId,
      ctx.input.serviceOptionId,
      ctx.input.locationCode,
      ctx.input.items
    );

    return {
      output: result,
      message: `Time slot reserved for user **${ctx.input.userId}**.\n\n- Hold ID: \`${result.serviceOptionHoldId}\`\n- Expires at: ${result.expiresAt}`
    };
  })
  .build();
